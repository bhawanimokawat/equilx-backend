
const { Worker } = require("bullmq");
const IORedis = require("ioredis");

const env = require("../../../config/env");
const { prisma } = require("../../../config/database");
const aiConfig = require("../config/ai.config");
const aiProvider = require("../providers/ai.provider");

const { buildWritingPrompt } = require("../prompts/writing.prompt");
const {
  buildSpeakingPrompt,
  SPEAKING_PROMPT_VERSION,
} = require("../prompts/speaking.prompt");

const {
  saveWritingEvaluation,
} = require("../../writing/services/writing-evaluation.service");

const {
  saveSpeakingEvaluation,
} = require("../../speaking/services/speaking-evaluation.service");

const {
  getRecordingFilePath,
} = require("../../speaking/storage/recording.storage");

const { createAIJob } = require("../services/ai-job.service");

let worker = null;
let connection = null;

function createWorkerError(message, code = "AI_PROCESSING_FAILED") {
  const error = new Error(message);
  error.code = code;
  return error;
}

function getMaxAttempts(job, databaseJob) {
  const databaseMaxAttempts = databaseJob.maxAttempts;

  if (
    !Number.isInteger(databaseMaxAttempts) ||
    databaseMaxAttempts < 1 ||
    databaseMaxAttempts > 5 ||
    job.opts.attempts !== databaseMaxAttempts
  ) {
    throw createWorkerError(
      "Invalid or mismatched AI job retry configuration.",
      500,
      "AI_RETRY_CONFIG_MISMATCH"
    );
  }

  return databaseMaxAttempts;
}

async function markJobProcessing(aiJobId, attemptNumber) {
  await prisma.aIJob.update({
    where: { id: aiJobId },
    data: {
      status: "PROCESSING",
      attempts: attemptNumber,
      startedAt: new Date(),
      errorCode: null,
      completedAt: null,
    },
  });
}

async function markJobCompleted(aiJobId, resultPayload) {
  await prisma.aIJob.update({
    where: { id: aiJobId },
    data: {
      status: "COMPLETED",
      resultPayload,
      completedAt: new Date(),
      errorCode: null,
    },
  });
}

async function markJobFailed({
  aiJobId,
  error,
  finalAttempt,
  submissionId,
  evaluationModel,
}) {
  await prisma.aIJob.update({
    where: { id: aiJobId },
    data: {
      status: finalAttempt ? "FAILED" : "QUEUED",
      errorCode: error.code || "AI_PROCESSING_FAILED",
      completedAt: finalAttempt ? new Date() : null,
    },
  });

  if (!finalAttempt || !submissionId || !evaluationModel) {
    return;
  }

  if (evaluationModel === "WRITING") {
    await prisma.writingEvaluation.updateMany({
      where: {
        submissionId,
        source: "AI",
        status: {
          in: ["PENDING", "PROCESSING"],
        },
      },
      data: {
        status: "FAILED",
        evaluatedAt: new Date(),
      },
    });
  }

  if (evaluationModel === "SPEAKING") {
    await prisma.speakingEvaluation.updateMany({
      where: {
        submissionId,
        source: "AI",
        status: {
          in: ["PENDING", "PROCESSING"],
        },
      },
      data: {
        status: "FAILED",
        evaluatedAt: new Date(),
      },
    });
  }
}

// --------------------------------------------------
// WRITING CONTEXT
// --------------------------------------------------

async function getWritingContext({ submissionId, userId }) {
  const submission = await prisma.writingSubmission.findFirst({
    where: {
      id: submissionId,
      userId,
    },
    select: {
      id: true,
      userId: true,
      attemptId: true,
      taskNumber: true,
      responseText: true,
      wordCount: true,
      attempt: {
        select: {
          testVersionId: true,
          usageType: true,
          moduleId: true,
          partId: true,
        },
      },
    },
  });

  if (!submission) {
    throw createWorkerError("Writing submission was not found.");
  }

  const questionWhere = {
    testPart: {
      testModule: {
        testVersionId: submission.attempt.testVersionId,
        section: "WRITING",
      },
    },
  };

  if (submission.attempt.usageType === "PRACTICE") {
    if (submission.attempt.moduleId) {
      questionWhere.testPart.testModule.id =
        submission.attempt.moduleId;
    } else if (submission.attempt.partId) {
      questionWhere.testPartId = submission.attempt.partId;
    } else {
      throw createWorkerError("Invalid Writing practice scope.");
    }
  }

  const questions = await prisma.question.findMany({
    where: questionWhere,
    select: {
      id: true,
      questionType: true,
      content: true,
    },
  });

  const matchingQuestions = questions.filter((question) => {
    if (
      submission.taskNumber === 1 &&
      ["REPORT", "LETTER"].includes(question.questionType)
    ) {
      return true;
    }

    return (
      submission.taskNumber === 2 &&
      question.questionType === "ESSAY"
    );
  });

  if (matchingQuestions.length !== 1) {
    throw createWorkerError(
      "The original Writing question could not be identified uniquely."
    );
  }

  const question = matchingQuestions[0];

  if (
    !question.content ||
    typeof question.content.task !== "string" ||
    !question.content.task.trim()
  ) {
    throw createWorkerError("Writing question content is invalid.");
  }

  return {
    submission,
    question: question.content.task,
  };
}

// --------------------------------------------------
// WRITING EVALUATION
// --------------------------------------------------

async function processWritingEvaluation({
  job,
  aiJob,
  payload,
  aiJobId,
}) {
  const { submissionId } = payload;

  if (typeof submissionId !== "string") {
    throw createWorkerError("Writing AI job payload is invalid.");
  }

  const completedEvaluation =
    await prisma.writingEvaluation.findFirst({
      where: {
        submissionId,
        source: "AI",
        status: "COMPLETED",
      },
      select: {
        id: true,
        overallBand: true,
        feedback: true,
      },
      orderBy: {
        evaluatedAt: "desc",
      },
    });

  if (completedEvaluation) {
    const resultPayload = {
      evaluationId: completedEvaluation.id,
      overallBand: completedEvaluation.overallBand,
      feedback: completedEvaluation.feedback,
      alreadyEvaluated: true,
    };

    await markJobCompleted(aiJobId, resultPayload);
    return resultPayload;
  }

  const { submission, question } = await getWritingContext({
    submissionId,
    userId: aiJob.userId,
  });

  const evaluationUpdate =
    await prisma.writingEvaluation.updateMany({
      where: {
        submissionId,
        source: "AI",
        status: {
          in: ["PENDING", "PROCESSING"],
        },
      },
      data: {
        status: "PROCESSING",
      },
    });

  if (evaluationUpdate.count === 0) {
    throw createWorkerError(
      "No pending Writing evaluation is available."
    );
  }

  await markJobProcessing(
    aiJobId,
    job.attemptsMade + 1
  );

  const promptData = buildWritingPrompt({
    taskNumber: submission.taskNumber,
    question,
    responseText: submission.responseText,
    wordCount: submission.wordCount,
  });

  const result = await aiProvider.generateText({
    prompt: promptData.prompt,
    systemInstruction: promptData.systemInstruction,
    generation: aiConfig.generation,
  });

  await saveWritingEvaluation({
    submissionId,
    aiResult: {
      text: result.text,
      model: result.model,
      usage: result.usage,
    },
  });

  const resultPayload = {
    model: result.model,
    usage: result.usage,
    evaluationCompleted: true,
  };

  await markJobCompleted(aiJobId, resultPayload);

  return resultPayload;
}

// --------------------------------------------------
// SPEAKING RECORDING CONTEXT
// --------------------------------------------------

async function getSpeakingRecording({ recordingId, userId }) {
  const recording = await prisma.speakingRecording.findFirst({
    where: {
      id: recordingId,
      consentStatus: "GRANTED",
      deletedAt: null,
      deleteAfter: {
        gt: new Date(),
      },
      submission: {
        userId,
        consentStatus: "GRANTED",
      },
    },
    select: {
      id: true,
      submissionId: true,
      storageKey: true,
      mimeType: true,
      consentStatus: true,
      deleteAfter: true,
      deletedAt: true,
      submission: {
        select: {
          id: true,
          userId: true,
          transcript: true,
          partNumber: true,
          consentStatus: true,
          attempt: {
            select: {
              testVersionId: true,
              usageType: true,
              moduleId: true,
              partId: true,
            },
          },
        },
      },
    },
  });

  if (!recording) {
    throw createWorkerError(
      "A valid consented Speaking recording was not found.",
      "SPEAKING_RECORDING_UNAVAILABLE"
    );
  }

  if (
    recording.consentStatus !== "GRANTED" ||
    recording.submission.consentStatus !== "GRANTED"
  ) {
    throw createWorkerError(
      "Recording consent is no longer active.",
      "RECORDING_CONSENT_WITHDRAWN"
    );
  }

  if (
    recording.deletedAt ||
    !recording.deleteAfter ||
    recording.deleteAfter <= new Date()
  ) {
    throw createWorkerError(
      "Speaking recording is no longer available.",
      "RECORDING_EXPIRED"
    );
  }

  return recording;
}

// --------------------------------------------------
// SPEAKING QUESTIONS
// --------------------------------------------------

async function getSpeakingQuestions({ submission }) {
  const attempt = submission.attempt;

  const testPartWhere = {
    position: submission.partNumber,
    testModule: {
      testVersionId: attempt.testVersionId,
      section: "SPEAKING",
    },
  };

  if (attempt.usageType === "PRACTICE") {
    if (attempt.partId) {
      testPartWhere.id = attempt.partId;
    } else if (attempt.moduleId) {
      testPartWhere.testModule.id = attempt.moduleId;
    } else {
      throw createWorkerError("Invalid Speaking practice scope.");
    }
  }

  const testPart = await prisma.testPart.findFirst({
    where: testPartWhere,
    select: {
      title: true,
      instructions: true,
      questions: {
        orderBy: {
          position: "asc",
        },
        select: {
          questionNumber: true,
          questionType: true,
          content: true,
        },
      },
    },
  });

  if (!testPart) {
    throw createWorkerError(
      "Original Speaking part could not be identified."
    );
  }

  return {
    title: testPart.title,
    instructions: testPart.instructions,
    questions: testPart.questions,
  };
}

// --------------------------------------------------
// TRANSCRIPTION
// --------------------------------------------------

async function processTranscription({
  job,
  aiJob,
  payload,
  aiJobId,
}) {
  const { recordingId } = payload;

  if (typeof recordingId !== "string") {
    throw createWorkerError("Transcription payload is invalid.");
  }

  await markJobProcessing(
    aiJobId,
    job.attemptsMade + 1
  );

  const recording = await getSpeakingRecording({
    recordingId,
    userId: aiJob.userId,
  });

  const filePath = getRecordingFilePath({
    storageKey: recording.storageKey,
  });

  const result = await aiProvider.transcribeAudio({
    filePath,
    mimeType: recording.mimeType,
  });

  if (
    typeof result.transcript !== "string" ||
    !result.transcript.trim() ||
    result.transcript.length > 30000
  ) {
    throw createWorkerError(
      "The generated transcript is invalid.",
      "INVALID_TRANSCRIPTION"
    );
  }

  // Recheck consent before saving the transcript.
  const currentRecording = await getSpeakingRecording({
    recordingId,
    userId: aiJob.userId,
  });

  await prisma.speakingSubmission.update({
    where: {
      id: currentRecording.submissionId,
    },
    data: {
      transcript: result.transcript.trim(),
    },
  });

  // Create or reuse the pending AI evaluation.
  let evaluation = await prisma.speakingEvaluation.findFirst({
    where: {
      submissionId: currentRecording.submissionId,
      source: "AI",
      status: {
        in: ["PENDING", "PROCESSING", "COMPLETED"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!evaluation) {
    evaluation = await prisma.speakingEvaluation.create({
      data: {
        submissionId: currentRecording.submissionId,
        source: "AI",
        status: "PENDING",
      },
      select: {
        id: true,
        status: true,
      },
    });
  }

  let evaluationJobId = null;

if (evaluation.status !== "COMPLETED") {
  const existingEvaluationJob = await prisma.aIJob.findFirst({
    where: {
      userId: aiJob.userId,
      jobType: "SPEAKING_EVALUATION",
      status: {
        in: ["QUEUED", "PROCESSING", "COMPLETED"],
      },
      inputPayload: {
        path: ["submissionId"],
        equals: currentRecording.submissionId,
      },
    },
    select: {
      id: true,
    },
  });

  if (existingEvaluationJob) {
    evaluationJobId = existingEvaluationJob.id;
  } else {
    const queuedJob = await createAIJob({
      userId: aiJob.userId,
      jobType: "SPEAKING_EVALUATION",
      payload: {
        submissionId: currentRecording.submissionId,
        promptVersion: SPEAKING_PROMPT_VERSION,
      },
    });

    evaluationJobId = queuedJob.id;
  }
}

  const resultPayload = {
    transcriptionCompleted: true,
    transcriptLength: result.transcript.trim().length,
    model: result.model,
    usage: result.usage,
    evaluationJobId,
  };

  await markJobCompleted(aiJobId, resultPayload);

  return resultPayload;
}

// --------------------------------------------------
// SPEAKING EVALUATION
// --------------------------------------------------

async function processSpeakingEvaluation({
  job,
  aiJob,
  payload,
  aiJobId,
}) {
  const { submissionId } = payload;

  if (typeof submissionId !== "string") {
    throw createWorkerError(
      "Speaking evaluation payload is invalid."
    );
  }

  const completedEvaluation =
    await prisma.speakingEvaluation.findFirst({
      where: {
        submissionId,
        source: "AI",
        status: "COMPLETED",
      },
      select: {
        id: true,
        overallBand: true,
        feedback: true,
      },
      orderBy: {
        evaluatedAt: "desc",
      },
    });

  if (completedEvaluation) {
    const resultPayload = {
      evaluationId: completedEvaluation.id,
      overallBand: completedEvaluation.overallBand,
      alreadyEvaluated: true,
    };

    await markJobCompleted(aiJobId, resultPayload);
    return resultPayload;
  }

  const submission = await prisma.speakingSubmission.findFirst({
    where: {
      id: submissionId,
      userId: aiJob.userId,
      consentStatus: "GRANTED",
    },
    select: {
      id: true,
      userId: true,
      transcript: true,
      partNumber: true,
      consentStatus: true,
      attempt: {
        select: {
          testVersionId: true,
          usageType: true,
          moduleId: true,
          partId: true,
        },
      },
      recordings: {
        where: {
          consentStatus: "GRANTED",
          deletedAt: null,
          deleteAfter: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          id: true,
        },
      },
    },
  });

  if (!submission || !submission.transcript?.trim()) {
    throw createWorkerError(
      "Speaking submission or transcript is unavailable."
    );
  }

  if (!submission.partNumber || submission.partNumber < 1 ||
      submission.partNumber > 3) {
    throw createWorkerError(
      "Invalid IELTS Speaking part number."
    );
  }

  if (submission.recordings.length === 0) {
    throw createWorkerError(
      "A consented original audio recording is required."
    );
  }

  const recordingId = submission.recordings[0].id;

  const recording = await getSpeakingRecording({
    recordingId,
    userId: aiJob.userId,
  });

  const evaluationUpdate =
    await prisma.speakingEvaluation.updateMany({
      where: {
        submissionId,
        source: "AI",
        status: {
          in: ["PENDING", "PROCESSING"],
        },
      },
      data: {
        status: "PROCESSING",
      },
    });

  if (evaluationUpdate.count === 0) {
    throw createWorkerError(
      "No pending Speaking evaluation is available."
    );
  }

  await markJobProcessing(
    aiJobId,
    job.attemptsMade + 1
  );

  const speakingContext = await getSpeakingQuestions({
    submission,
  });

  const promptData = buildSpeakingPrompt({
    transcript: submission.transcript,
    partNumber: submission.partNumber,
    questions: speakingContext.questions,
    audioEvidenceAvailable: true,
    speechMetrics: null,
  });

  const filePath = getRecordingFilePath({
    storageKey: recording.storageKey,
  });

  // The actual recording is sent with the transcript prompt.
  const result = await aiProvider.generateAudioEvaluation({
    prompt: promptData.prompt,
    systemInstruction: promptData.systemInstruction,
    filePath,
    mimeType: recording.mimeType,
  });

  // Verify consent again before persisting evaluation.
  await getSpeakingRecording({
    recordingId,
    userId: aiJob.userId,
  });

  await saveSpeakingEvaluation({
    submissionId,
    aiResult: {
      text: result.text,
      model: result.model,
      usage: result.usage,
    },
    audioEvidenceAvailable: true,
    pronunciationEvidenceAvailable: true,
  });

  const resultPayload = {
    model: result.model,
    usage: result.usage,
    evaluationCompleted: true,
  };

  await markJobCompleted(aiJobId, resultPayload);

  return resultPayload;
}

// --------------------------------------------------
// MAIN JOB DISPATCHER
// --------------------------------------------------

async function processAIJob(job) {
  const { aiJobId } = job.data || {};

  if (!aiJobId) {
    throw createWorkerError("AI database job ID is missing.");
  }

  const aiJob = await prisma.aIJob.findUnique({
    where: {
      id: aiJobId,
    },
    select: {
      id: true,
      userId: true,
      jobType: true,
      status: true,
      inputPayload: true,
      maxAttempts: true,
      resultPayload: true,
    },
  });

  if (!aiJob) {
    throw createWorkerError("AI database job was not found.");
  }

  if (aiJob.status === "COMPLETED") {
    return aiJob.resultPayload;
  }

  if (job.name !== aiJob.jobType) {
    throw createWorkerError(
      "BullMQ job name does not match the database job type."
    );
  }

  const payload = aiJob.inputPayload;

  if (!payload || typeof payload !== "object") {
    throw createWorkerError("AI job payload is invalid.");
  }

  const maxAttempts = getMaxAttempts(job, aiJob);
  const finalAttempt = job.attemptsMade + 1 >= maxAttempts;

  let evaluationModel = null;
  let submissionId = null;

  if (aiJob.jobType === "WRITING_EVALUATION") {
    evaluationModel = "WRITING";
    submissionId = payload.submissionId;
  }

  if (aiJob.jobType === "SPEAKING_EVALUATION") {
    evaluationModel = "SPEAKING";
    submissionId = payload.submissionId;
  }

  try {
    const context = {
      job,
      aiJob,
      payload,
      aiJobId,
    };

    switch (aiJob.jobType) {
      case "WRITING_EVALUATION":
        return await processWritingEvaluation(context);

      case "TRANSCRIPTION":
        return await processTranscription(context);

      case "SPEAKING_EVALUATION":
        return await processSpeakingEvaluation(context);

      default:
        throw createWorkerError(
          `No handler exists for AI job type: ${aiJob.jobType}`
        );
    }
  } catch (error) {
    try {
      await markJobFailed({
        aiJobId,
        error,
        finalAttempt,
        submissionId,
        evaluationModel,
      });
    } catch (updateError) {
      console.error(
        "[AI WORKER] Failed to update job status:",
        updateError.message
      );
    }

    throw error;
  }
}

// --------------------------------------------------
// WORKER LIFECYCLE
// --------------------------------------------------

function startAIWorker() {
  if (worker) {
    return worker;
  }

  connection = new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
  });

  connection.on("error", (error) => {
    console.error("[AI WORKER REDIS ERROR]", error.message);
  });

  worker = new Worker(
    aiConfig.queue.name,
    processAIJob,
    {
      connection,
      concurrency: 3,
    }
  );

  worker.on("completed", (job) => {
    console.log(`[AI WORKER] Job completed: ${job.id}`);
  });

  worker.on("failed", (job, error) => {
    console.error(
      `[AI WORKER] Job failed: ${job?.id}`,
      error.message
    );
  });

  worker.on("error", (error) => {
    console.error("[AI WORKER ERROR]", error.message);
  });

  console.log("[AI WORKER] Started successfully.");

  return worker;
}

async function closeAIWorker() {
  if (worker) {
    await worker.close();
    worker = null;
  }

  if (connection) {
    await connection.quit();
    connection = null;
  }
}

module.exports = {
  startAIWorker,
  closeAIWorker,
  processAIJob,
};
