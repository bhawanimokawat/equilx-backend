
const { prisma } = require("../../../config/database");
const { createAIJob } = require("../../ai/services/ai-job.service");

function createServiceError(
  message,
  statusCode = 400,
  code = "SPEAKING_ERROR"
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function getSpeakingAttempt({ userId, attemptId }) {
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId },
    select: {
      id: true,
      testVersionId: true,
      usageType: true,
      moduleId: true,
      partId: true,
      status: true,
      deadlineAt: true,
    },
  });

  if (!attempt) {
    throw createServiceError(
      "Speaking attempt was not found.",
      404,
      "ATTEMPT_NOT_FOUND"
    );
  }

  if (attempt.status !== "IN_PROGRESS") {
    throw createServiceError(
      "This Speaking attempt is not active.",
      409,
      "ATTEMPT_NOT_ACTIVE"
    );
  }

  if (attempt.deadlineAt && new Date() > attempt.deadlineAt) {
    throw createServiceError(
      "The Speaking attempt deadline has passed.",
      409,
      "ATTEMPT_EXPIRED"
    );
  }

  return attempt;
}

async function verifySpeakingQuestions(attempt) {
  const questionWhere = {
    testPart: {
      testModule: {
        testVersionId: attempt.testVersionId,
        section: "SPEAKING",
      },
    },
    questionType: "SPEAKING_RESPONSE",
  };

  if (attempt.usageType === "PRACTICE") {
    if (attempt.moduleId) {
      questionWhere.testPart.testModule.id = attempt.moduleId;
    } else if (attempt.partId) {
      questionWhere.testPartId = attempt.partId;
    } else {
      throw createServiceError(
        "Invalid Speaking practice scope.",
        400,
        "INVALID_PRACTICE_SCOPE"
      );
    }
  }

  const questionCount = await prisma.question.count({
    where: questionWhere,
  });

  if (questionCount === 0) {
    throw createServiceError(
      "No Speaking questions were found for this attempt.",
      404,
      "SPEAKING_QUESTIONS_NOT_FOUND"
    );
  }
}

async function createSpeakingSubmission({
  userId,
  attemptId,
  partNumber,
  consentStatus,
}) {
  if (!userId || !attemptId) {
    throw createServiceError("User ID and attempt ID are required.");
  }

  if (![1, 2, 3].includes(partNumber)) {
    throw createServiceError(
      "Speaking part number must be between 1 and 3."
    );
  }

  if (consentStatus !== "GRANTED") {
    throw createServiceError(
      "Recording consent is required before creating a Speaking submission.",
      403,
      "RECORDING_CONSENT_REQUIRED"
    );
  }

  const attempt = await getSpeakingAttempt({ userId, attemptId });

  await verifySpeakingQuestions(attempt);

  const existingSubmission = await prisma.speakingSubmission.findFirst({
    where: {
      attemptId,
      userId,
      partNumber,
    },
    select: { id: true },
  });

  if (existingSubmission) {
    throw createServiceError(
      "A Speaking submission already exists for this part.",
      409,
      "SPEAKING_ALREADY_SUBMITTED"
    );
  }

  return prisma.speakingSubmission.create({
    data: {
      userId,
      attemptId,
      partNumber,
      consentStatus: "GRANTED",
    },
    select: {
      id: true,
      attemptId: true,
      partNumber: true,
      consentStatus: true,
      submittedAt: true,
      createdAt: true,
    },
  });
}

async function completeSpeakingSubmission({ userId, submissionId }) {
  if (!userId || !submissionId) {
    throw createServiceError(
      "User ID and submission ID are required."
    );
  }

  const submission = await prisma.speakingSubmission.findFirst({
    where: {
      id: submissionId,
      userId,
    },
    include: {
      attempt: {
        select: {
          id: true,
          status: true,
          deadlineAt: true,
        },
      },
      recordings: {
        where: {
          consentStatus: "GRANTED",
          deletedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
          storageKey: true,
          mimeType: true,
          deleteAfter: true,
          consentStatus: true,
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
      "Recording consent is not available for this submission.",
      403,
      "RECORDING_CONSENT_REQUIRED"
    );
  }

  const recording = submission.recordings[0];

  if (!recording) {
    throw createServiceError(
      "A valid audio recording is required before transcription.",
      400,
      "SPEAKING_RECORDING_REQUIRED"
    );
  }

  if (recording.deleteAfter && recording.deleteAfter <= new Date()) {
    throw createServiceError(
      "The recording has expired and cannot be processed.",
      410,
      "SPEAKING_RECORDING_EXPIRED"
    );
  }

  if (
    !["IN_PROGRESS", "SUBMITTED", "AUTO_SUBMITTED"].includes(
      submission.attempt.status
    )
  ) {
    throw createServiceError(
      "The Speaking attempt cannot be processed.",
      409,
      "INVALID_ATTEMPT_STATUS"
    );
  }

  if (
    submission.attempt.status === "IN_PROGRESS" &&
    submission.attempt.deadlineAt &&
    new Date() > submission.attempt.deadlineAt
  ) {
    throw createServiceError(
      "The Speaking attempt deadline has passed.",
      409,
      "ATTEMPT_EXPIRED"
    );
  }

  if (submission.transcript) {
    throw createServiceError(
      "This Speaking recording has already been transcribed.",
      409,
      "SPEAKING_ALREADY_TRANSCRIBED"
    );
  }

  const existingJob = await prisma.aIJob.findFirst({
    where: {
      userId,
      jobType: "TRANSCRIPTION",
      status: {
        in: ["QUEUED", "PROCESSING", "COMPLETED"],
      },
      inputPayload: {
        equals: {
          recordingId: recording.id,
        },
      },
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (existingJob) {
    throw createServiceError(
      "Transcription has already been queued or completed for this recording.",
      409,
      "TRANSCRIPTION_ALREADY_REQUESTED"
    );
  }

  let aiJob;

  try {
    aiJob = await createAIJob({
      userId,
      jobType: "TRANSCRIPTION",
      payload: {
        recordingId: recording.id,
      },
    });
  } catch (error) {
    throw createServiceError(
      "Speaking transcription could not be queued.",
      503,
      "TRANSCRIPTION_QUEUE_FAILED"
    );
  }

  return {
    submissionId,
    recordingId: recording.id,
    transcription: {
      status: aiJob.status,
      jobId: aiJob.id,
    },
  };
}

module.exports = {
  createSpeakingSubmission,
  completeSpeakingSubmission,
};
