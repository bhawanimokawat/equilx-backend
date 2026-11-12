
const { prisma } = require("../../../config/database");

function createServiceError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function parseAIResponse(text) {
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("AI evaluation response is empty.");
  }

  let cleaned = text.trim();

  // Remove optional Markdown JSON fences.
  cleaned = cleaned
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("AI evaluation response must be a JSON object.");
  }

  return parsed;
}

function validateBand(value, fieldName) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 9 ||
    !Number.isInteger(value * 2)
  ) {
    throw new Error(`Invalid IELTS band score for ${fieldName}.`);
  }

  return value;
}

function validateFeedback(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`Missing feedback for ${fieldName}.`);
  }

  return value.trim().slice(0, 5000);
}

function validateStringArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldName} must be an array.`);
  }

  if (value.length > 20) {
    throw new Error(`${fieldName} contains too many items.`);
  }

  return value.map((item) => {
    if (typeof item !== "string" || !item.trim()) {
      throw new Error(`Invalid item in ${fieldName}.`);
    }

    return item.trim().slice(0, 2000);
  });
}

function calculateOverallBand(bands) {
  const average =
    (
      bands.taskResponse +
      bands.coherence +
      bands.lexical +
      bands.grammar
    ) / 4;

  // IELTS overall band is rounded to the nearest 0.5.
  return Math.round(average * 2) / 2;
}

function validateEvaluationResult(result, expectedTaskNumber) {
  if (
    !result ||
    typeof result !== "object" ||
    Array.isArray(result)
  ) {
    throw new Error("Invalid evaluation result.");
  }

  if (result.taskNumber !== expectedTaskNumber) {
    throw new Error("AI evaluation task number does not match submission.");
  }

  const taskCriterion =
    expectedTaskNumber === 1
      ? "Task Achievement"
      : "Task Response";

  if (!result.criteria || typeof result.criteria !== "object") {
    throw new Error("AI evaluation criteria are missing.");
  }

  const taskCriterionResult = result.criteria[taskCriterion];
  const coherenceResult = result.criteria["Coherence and Cohesion"];
  const lexicalResult = result.criteria["Lexical Resource"];
  const grammarResult =
    result.criteria["Grammatical Range and Accuracy"];

  const bands = {
    taskResponse: validateBand(
      taskCriterionResult?.band,
      taskCriterion
    ),
    coherence: validateBand(
      coherenceResult?.band,
      "Coherence and Cohesion"
    ),
    lexical: validateBand(
      lexicalResult?.band,
      "Lexical Resource"
    ),
    grammar: validateBand(
      grammarResult?.band,
      "Grammatical Range and Accuracy"
    ),
  };

  const criteria = {
    [taskCriterion]: {
      band: bands.taskResponse,
      feedback: validateFeedback(
        taskCriterionResult.feedback,
        taskCriterion
      ),
    },
    "Coherence and Cohesion": {
      band: bands.coherence,
      feedback: validateFeedback(
        coherenceResult.feedback,
        "Coherence and Cohesion"
      ),
    },
    "Lexical Resource": {
      band: bands.lexical,
      feedback: validateFeedback(
        lexicalResult.feedback,
        "Lexical Resource"
      ),
    },
    "Grammatical Range and Accuracy": {
      band: bands.grammar,
      feedback: validateFeedback(
        grammarResult.feedback,
        "Grammatical Range and Accuracy"
      ),
    },
  };

  const strengths = validateStringArray(
    result.strengths,
    "Strengths"
  );

  const improvements = validateStringArray(
    result.improvements,
    "Improvements"
  );

  if (!Array.isArray(result.sentenceCorrections)) {
    throw new Error("Sentence corrections must be an array.");
  }

  if (result.sentenceCorrections.length > 50) {
    throw new Error("Too many sentence corrections.");
  }

  const sentenceCorrections = result.sentenceCorrections.map(
    (item) => {
      if (!item || typeof item !== "object") {
        throw new Error("Invalid sentence correction.");
      }

      return {
        original: validateFeedback(
          item.original,
          "Correction original"
        ),
        corrected: validateFeedback(
          item.corrected,
          "Correction corrected"
        ),
        explanation: validateFeedback(
          item.explanation,
          "Correction explanation"
        ),
      };
    }
  );

  if (
    typeof result.improvedResponse !== "string" ||
    !result.improvedResponse.trim()
  ) {
    throw new Error("Improved example response is missing.");
  }

  const overallBand = calculateOverallBand(bands);

  return {
    bands,
    overallBand,
    feedback: {
      taskNumber: expectedTaskNumber,
      criteria,
      strengths,
      improvements,
      sentenceCorrections,
      improvedResponse: result.improvedResponse.trim().slice(0, 30000),
      isOfficialIELTSResult: false,
    },
  };
}

async function saveWritingEvaluation({
  submissionId,
  aiResult,
}) {
  if (!submissionId) {
    throw new Error("Writing submission ID is required.");
  }

  const parsedResult = parseAIResponse(aiResult?.text);

  const submission = await prisma.writingSubmission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      id: true,
      taskNumber: true,
    },
  });

  if (!submission) {
    throw createServiceError(
      "Writing submission not found.",
      404,
      "WRITING_SUBMISSION_NOT_FOUND"
    );
  }

  const validated = validateEvaluationResult(
    parsedResult,
    submission.taskNumber
  );

  return prisma.$transaction(async (tx) => {
    const evaluation = await tx.writingEvaluation.findFirst({
      where: {
        submissionId,
        source: "AI",
        status: {
          in: ["PENDING", "PROCESSING"],
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!evaluation) {
      throw createServiceError(
        "Pending AI evaluation record not found.",
        404,
        "WRITING_EVALUATION_NOT_FOUND"
      );
    }

    return tx.writingEvaluation.update({
      where: {
        id: evaluation.id,
      },
      data: {
        status: "COMPLETED",
        taskResponseBand: validated.bands.taskResponse,
        coherenceBand: validated.bands.coherence,
        lexicalBand: validated.bands.lexical,
        grammarBand: validated.bands.grammar,
        overallBand: validated.overallBand,
        feedback: validated.feedback,
        isFinal: false,
        evaluatedAt: new Date(),
      },
    });
  });
}

module.exports = {
  parseAIResponse,
  validateEvaluationResult,
  calculateOverallBand,
  saveWritingEvaluation,
};
