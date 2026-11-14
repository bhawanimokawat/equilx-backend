
const { prisma } = require("../../../config/database");

function createServiceError(
  message,
  statusCode = 400,
  code = "SPEAKING_EVALUATION_ERROR"
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function parseAIResponse(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw createServiceError(
      "AI evaluation response is empty.",
      502,
      "EMPTY_AI_RESPONSE"
    );
  }

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    throw createServiceError(
      "AI evaluation returned invalid JSON.",
      502,
      "INVALID_AI_JSON"
    );
  }
}

function validateBand(value, fieldName) {
  const band = Number(value);

  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(band) ||
    band < 0 ||
    band > 9 ||
    Math.round(band * 2) !== band * 2
  ) {
    throw createServiceError(
      `Invalid IELTS band score for ${fieldName}.`,
      502,
      "INVALID_AI_BAND"
    );
  }

  return band;
}

function validateString(value, fieldName, maxLength = 2000) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.length > maxLength
  ) {
    throw createServiceError(
      `Invalid AI feedback field: ${fieldName}.`,
      502,
      "INVALID_AI_FEEDBACK"
    );
  }

  return value.trim();
}

function validateStringArray(value, fieldName, maxItems = 20) {
  if (
    !Array.isArray(value) ||
    value.length > maxItems ||
    value.some(
      (item) =>
        typeof item !== "string" ||
        !item.trim() ||
        item.length > 1000
    )
  ) {
    throw createServiceError(
      `Invalid AI feedback list: ${fieldName}.`,
      502,
      "INVALID_AI_FEEDBACK"
    );
  }

  return value.map((item) => item.trim());
}

function validateTranscriptHighlights(value) {
  if (
    !Array.isArray(value) ||
    value.length > 30
  ) {
    throw createServiceError(
      "Invalid transcript highlights.",
      502,
      "INVALID_TRANSCRIPT_HIGHLIGHTS"
    );
  }

  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw createServiceError(
        "Invalid transcript highlight.",
        502,
        "INVALID_TRANSCRIPT_HIGHLIGHTS"
      );
    }

    return {
      text: validateString(item.text, "highlight text", 1000),
      issue: validateString(item.issue, "highlight issue", 1000),
      suggestion: validateString(item.suggestion, "highlight suggestion", 1000),
    };
  });
}

function calculateOverallBand(bands) {
  const average =
    (
      bands.fluencyBand +
      bands.lexicalBand +
      bands.grammarBand +
      bands.pronunciationBand
    ) / 4;

  return Math.round(average * 2) / 2;
}

function validateEvaluationResult(
  result,
  {
    audioEvidenceAvailable = false,
    pronunciationEvidenceAvailable = false,
  } = {}
) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw createServiceError(
      "Invalid Speaking evaluation result.",
      502,
      "INVALID_AI_RESULT"
    );
  }

  if (![1, 2, 3].includes(result.partNumber)) {
    throw createServiceError(
      "Invalid Speaking part number in AI result.",
      502,
      "INVALID_AI_PART_NUMBER"
    );
  }

  const criteria = result.criteria;

  if (!criteria || typeof criteria !== "object" || Array.isArray(criteria)) {
    throw createServiceError(
      "Speaking evaluation criteria are missing.",
      502,
      "MISSING_AI_CRITERIA"
    );
  }

  const fluencyBand = validateBand(
    criteria.fluencyAndCoherence?.band,
    "Fluency and Coherence"
  );

  const lexicalBand = validateBand(
    criteria.lexicalResource?.band,
    "Lexical Resource"
  );

  const grammarBand = validateBand(
    criteria.grammaticalRangeAndAccuracy?.band,
    "Grammatical Range and Accuracy"
  );

  let pronunciationBand = null;
  let pronunciationStatus = "NOT_ASSESSED";

  if (pronunciationEvidenceAvailable && audioEvidenceAvailable) {
    pronunciationBand = validateBand(
      criteria.pronunciation?.band,
      "Pronunciation"
    );

    if (criteria.pronunciation?.status !== "ASSESSED") {
      throw createServiceError(
        "Pronunciation assessment status is invalid.",
        502,
        "INVALID_PRONUNCIATION_STATUS"
      );
    }

    pronunciationStatus = "ASSESSED";
  } else if (
    criteria.pronunciation?.band !== null ||
    criteria.pronunciation?.status !== "NOT_ASSESSED"
  ) {
    throw createServiceError(
      "Pronunciation cannot be scored without verified audio-derived evidence.",
      502,
      "PRONUNCIATION_WITHOUT_EVIDENCE"
    );
  }

  const feedback = {
    fluencyAndCoherence: validateString(
      criteria.fluencyAndCoherence?.feedback,
      "Fluency and Coherence feedback"
    ),

    lexicalResource: validateString(
      criteria.lexicalResource?.feedback,
      "Lexical Resource feedback"
    ),

    grammaticalRangeAndAccuracy: validateString(
      criteria.grammaticalRangeAndAccuracy?.feedback,
      "Grammar feedback"
    ),

    pronunciation: validateString(
      criteria.pronunciation?.feedback,
      "Pronunciation feedback"
    ),

    pronunciationStatus,

    strengths: validateStringArray(result.strengths, "strengths"),
    improvements: validateStringArray(result.improvements, "improvements"),
    practiceTips: validateStringArray(result.practiceTips, "practiceTips"),
  };

  const bands = {
    fluencyBand,
    lexicalBand,
    grammarBand,
    pronunciationBand,
  };

  const overallBand =
    pronunciationBand !== null
      ? calculateOverallBand(bands)
      : null;

  if (
    result.overallBand !== null &&
    result.overallBand !== undefined &&
    overallBand !== null &&
    validateBand(result.overallBand, "Overall band") !== overallBand
  ) {
    throw createServiceError(
      "AI overall band does not match the calculated band.",
      502,
      "INVALID_OVERALL_BAND"
    );
  }

  return {
    ...bands,
    overallBand,
    feedback,
    transcriptHighlights: validateTranscriptHighlights(
      result.transcriptHighlights
    ),
  };
}

async function saveSpeakingEvaluation({
  submissionId,
  aiResult,
  audioEvidenceAvailable = false,
  pronunciationEvidenceAvailable = false,
}) {
  if (!submissionId) {
    throw createServiceError("Speaking submission ID is required.");
  }

  const parsedResult = parseAIResponse(aiResult?.text);

  const validated = validateEvaluationResult(parsedResult, {
    audioEvidenceAvailable: audioEvidenceAvailable === true,
    pronunciationEvidenceAvailable:
      pronunciationEvidenceAvailable === true,
  });

  const submission = await prisma.speakingSubmission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      consentStatus: true,
      recordings: {
        where: {
          consentStatus: "GRANTED",
          deletedAt: null,
        },
        select: {
          id: true,
          deleteAfter: true,
        },
      },
    },
  });

  if (!submission) {
    throw createServiceError(
      "Speaking submission was not found.",
      404,
      "SPEAKING_SUBMISSION_NOT_FOUND"
    );
  }

  if (submission.consentStatus !== "GRANTED") {
    throw createServiceError(
      "Recording consent is not active.",
      403,
      "RECORDING_CONSENT_REQUIRED"
    );
  }

  const now = new Date();

  const hasValidAudio = submission.recordings.some(
    (recording) =>
      !recording.deleteAfter ||
      recording.deleteAfter > now
  );

  if (audioEvidenceAvailable && !hasValidAudio) {
    throw createServiceError(
      "Valid audio evidence is no longer available.",
      409,
      "AUDIO_EVIDENCE_UNAVAILABLE"
    );
  }

  return prisma.$transaction(async (tx) => {
    const pendingEvaluation = await tx.speakingEvaluation.findFirst({
      where: {
        submissionId,
        source: "AI",
        status: {
          in: ["PENDING", "PROCESSING"],
        },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!pendingEvaluation) {
      throw createServiceError(
        "No pending Speaking evaluation is available.",
        409,
        "PENDING_EVALUATION_NOT_FOUND"
      );
    }

    return tx.speakingEvaluation.update({
      where: { id: pendingEvaluation.id },
      data: {
        status: "COMPLETED",
        fluencyBand: validated.fluencyBand,
        lexicalBand: validated.lexicalBand,
        grammarBand: validated.grammarBand,
        pronunciationBand: validated.pronunciationBand,
        overallBand: validated.overallBand,
        feedback: validated.feedback,
        transcriptHighlights: validated.transcriptHighlights,
        isFinal: false,
        evaluatedAt: now,
      },
      select: {
        id: true,
        submissionId: true,
        status: true,
        fluencyBand: true,
        lexicalBand: true,
        grammarBand: true,
        pronunciationBand: true,
        overallBand: true,
        feedback: true,
        transcriptHighlights: true,
        isFinal: true,
        evaluatedAt: true,
      },
    });
  });
}

module.exports = {
  parseAIResponse,
  validateEvaluationResult,
  calculateOverallBand,
  saveSpeakingEvaluation,
};
