
const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

// --------------------------------------------------
// MOCK STATE
// --------------------------------------------------

let databaseJob = null;
let databaseCalls = [];
let databaseFindError = null;
let databaseUpdateError = null;

let writingCompletedEvaluation = null;
let writingSubmission = null;
let writingQuestions = [];
let writingEvaluationUpdateCount = 1;

let writingPromptData = null;
let writingPromptCall = null;

let writingFallbackResult = null;
let writingFallbackCall = null;

let writingSaveCall = null;
let writingSaveError = null;

// --------------------------------------------------
// PRISMA MOCKS
// --------------------------------------------------

const prisma = {
  aIJob: {
    async findUnique(query) {
      databaseCalls.push({
        method: "aIJob.findUnique",
        query,
      });

      if (databaseFindError) {
        throw databaseFindError;
      }

      return databaseJob;
    },

    async update(query) {
      databaseCalls.push({
        method: "aIJob.update",
        query,
      });

      if (databaseUpdateError) {
        throw databaseUpdateError;
      }

      return { id: query.where.id };
    },
  },

  writingEvaluation: {
    async findFirst(query) {
      databaseCalls.push({
        method: "writingEvaluation.findFirst",
        query,
      });

      return writingCompletedEvaluation;
    },

    async updateMany(query) {
      databaseCalls.push({
        method: "writingEvaluation.updateMany",
        query,
      });

      return {
        count: writingEvaluationUpdateCount,
      };
    },
  },

  writingSubmission: {
    async findFirst(query) {
      databaseCalls.push({
        method: "writingSubmission.findFirst",
        query,
      });

      return writingSubmission;
    },
  },

  question: {
    async findMany(query) {
      databaseCalls.push({
        method: "question.findMany",
        query,
      });

      return writingQuestions;
    },
  },

  speakingEvaluation: {
    async updateMany(query) {
      databaseCalls.push({
        method: "speakingEvaluation.updateMany",
        query,
      });

      return { count: 1 };
    },
  },
};

// --------------------------------------------------
// MODULE MOCKING
// --------------------------------------------------

function mockModule(relativePath, exports) {
  const filename = require.resolve(
    path.resolve(__dirname, relativePath)
  );

  require.cache[filename] = {
    id: filename,
    filename,
    loaded: true,
    exports,
  };
}

mockModule("../../src/config/env", {
  REDIS_URL: "redis://localhost:6379",
});

mockModule("../../src/config/database", {
  prisma,
});

mockModule("../../src/modules/ai/config/ai.config", {
  queue: {
    name: "equilx-ai",
  },
  generation: {
    temperature: 0.2,
    maxOutputTokens: 4096,
  },
});

// --------------------------------------------------
// AI FALLBACK MOCK
// --------------------------------------------------

mockModule("../../src/modules/ai/services/ai-fallback.service", {
  generateTextWithFallback: async (options) => {
    writingFallbackCall = options;

    if (!writingFallbackResult) {
      throw new Error("Unexpected Writing provider call");
    }

    return writingFallbackResult;
  },

  transcribeAudioWithFallback: async () => {
    throw new Error("Unexpected Transcription provider call");
  },

  generateAudioEvaluationWithFallback: async () => {
    throw new Error("Unexpected Speaking provider call");
  },
});

// --------------------------------------------------
// PROMPT MOCKS
// --------------------------------------------------

mockModule("../../src/modules/ai/prompts/writing.prompt", {
  buildWritingPrompt: (options) => {
    writingPromptCall = options;

    if (!writingPromptData) {
      throw new Error("Unexpected Writing prompt call");
    }

    return writingPromptData;
  },
});

mockModule("../../src/modules/ai/prompts/speaking.prompt", {
  buildSpeakingPrompt: () => {
    throw new Error("Unexpected Speaking prompt call");
  },

  SPEAKING_PROMPT_VERSION: "test-version",
});

// --------------------------------------------------
// EVALUATION SERVICE MOCKS
// --------------------------------------------------

mockModule(
  "../../src/modules/writing/services/writing-evaluation.service",
  {
    saveWritingEvaluation: async (options) => {
      writingSaveCall = options;

      if (writingSaveError) {
        throw writingSaveError;
      }
    },
  }
);

mockModule(
  "../../src/modules/speaking/services/speaking-evaluation.service",
  {
    saveSpeakingEvaluation: async () => {},
  }
);

// --------------------------------------------------
// RECORDING STORAGE MOCK
// --------------------------------------------------

mockModule(
  "../../src/modules/speaking/storage/recording.storage",
  {
    getRecordingFilePath: () => "/tmp/test-recording.webm",
  }
);

mockModule("../../src/modules/ai/services/ai-job.service", {
  createAIJob: async () => ({
    id: "generated-ai-job-id",
  }),
});

// Load worker only after installing mocks.
const {
  processAIJob,
} = require("../../src/modules/ai/workers/ai.worker");

// --------------------------------------------------
// TEST HELPERS
// --------------------------------------------------

function resetMocks() {
  databaseJob = null;
  databaseCalls = [];
  databaseFindError = null;
  databaseUpdateError = null;

  writingCompletedEvaluation = null;
  writingSubmission = null;
  writingQuestions = [];
  writingEvaluationUpdateCount = 1;

  writingPromptData = null;
  writingPromptCall = null;

  writingFallbackResult = null;
  writingFallbackCall = null;

  writingSaveCall = null;
  writingSaveError = null;
}

function createDatabaseJob(overrides = {}) {
  return {
    id: "ai-job-123",
    userId: "user-123",
    jobType: "UNKNOWN_JOB",
    status: "QUEUED",
    inputPayload: {},
    maxAttempts: 3,
    resultPayload: null,
    ...overrides,
  };
}

function createBullJob(overrides = {}) {
  return {
    id: "bull-job-123",
    name: "UNKNOWN_JOB",
    data: {
      aiJobId: "ai-job-123",
    },
    opts: {
      attempts: 3,
    },
    attemptsMade: 0,
    ...overrides,
  };
}

// --------------------------------------------------
// JOB ID VALIDATION
// --------------------------------------------------

test("Missing AI database job ID is rejected", async () => {
  resetMocks();

  await assert.rejects(
    processAIJob({
      data: {},
    }),
    {
      code: "AI_JOB_ID_MISSING",
    }
  );

  assert.equal(databaseCalls.length, 0);
});

test("Empty AI database job ID is rejected", async () => {
  resetMocks();

  await assert.rejects(
    processAIJob({
      data: {
        aiJobId: "   ",
      },
    }),
    {
      code: "AI_JOB_ID_MISSING",
    }
  );

  assert.equal(databaseCalls.length, 0);
});

// --------------------------------------------------
// DATABASE JOB VALIDATION
// --------------------------------------------------

test("Missing database job is rejected", async () => {
  resetMocks();

  await assert.rejects(
    processAIJob(createBullJob()),
    {
      code: "AI_JOB_NOT_FOUND",
    }
  );

  assert.equal(
    databaseCalls.filter(
      (call) => call.method === "aIJob.findUnique"
    ).length,
    1
  );
});

test("Database lookup errors are propagated", async () => {
  resetMocks();

  const expectedError = new Error("Database unavailable");

  databaseFindError = expectedError;

  await assert.rejects(
    processAIJob(createBullJob()),
    (error) => error === expectedError
  );
});

// --------------------------------------------------
// IDEMPOTENCY
// --------------------------------------------------

test("Completed AI jobs return the existing result", async () => {
  resetMocks();

  const existingResult = {
    evaluationCompleted: true,
    model: "test-model",
  };

  databaseJob = createDatabaseJob({
    status: "COMPLETED",
    resultPayload: existingResult,
  });

  const result = await processAIJob(createBullJob());

  assert.deepEqual(result, existingResult);

  assert.equal(
    databaseCalls.some(
      (call) => call.method === "aIJob.update"
    ),
    false
  );
});

// --------------------------------------------------
// JOB NAME VALIDATION
// --------------------------------------------------

test("Mismatched BullMQ job name is rejected", async () => {
  resetMocks();

  databaseJob = createDatabaseJob({
    jobType: "WRITING_EVALUATION",
  });

  await assert.rejects(
    processAIJob(
      createBullJob({
        name: "TRANSCRIPTION",
      })
    ),
    {
      code: "AI_JOB_TYPE_MISMATCH",
    }
  );

  assert.equal(
    databaseCalls.some(
      (call) => call.method === "aIJob.update"
    ),
    false
  );
});

// --------------------------------------------------
// PAYLOAD VALIDATION
// --------------------------------------------------

test("Missing AI job payload is rejected", async () => {
  resetMocks();

  databaseJob = createDatabaseJob({
    jobType: "UNSUPPORTED_JOB",
    inputPayload: null,
  });

  await assert.rejects(
    processAIJob(
      createBullJob({
        name: "UNSUPPORTED_JOB",
      })
    ),
    {
      code: "AI_JOB_PAYLOAD_INVALID",
    }
  );

  assert.equal(
    databaseCalls.some(
      (call) => call.method === "aIJob.update"
    ),
    false
  );
});

test("Array AI job payload is rejected", async () => {
  resetMocks();

  databaseJob = createDatabaseJob({
    jobType: "UNSUPPORTED_JOB",
    inputPayload: [],
  });

  await assert.rejects(
    processAIJob(
      createBullJob({
        name: "UNSUPPORTED_JOB",
      })
    ),
    {
      code: "AI_JOB_PAYLOAD_INVALID",
    }
  );

  assert.equal(
    databaseCalls.some(
      (call) => call.method === "aIJob.update"
    ),
    false
  );
});

// --------------------------------------------------
// RETRY CONFIGURATION
// --------------------------------------------------

test("Mismatched retry configuration is rejected", async () => {
  resetMocks();

  databaseJob = createDatabaseJob({
    maxAttempts: 3,
  });

  await assert.rejects(
    processAIJob(
      createBullJob({
        opts: {
          attempts: 2,
        },
      })
    ),
    {
      code: "AI_RETRY_CONFIG_MISMATCH",
    }
  );

  assert.equal(
    databaseCalls.some(
      (call) => call.method === "aIJob.update"
    ),
    false
  );
});

test("Retry configuration above maximum is rejected", async () => {
  resetMocks();

  databaseJob = createDatabaseJob({
    maxAttempts: 6,
  });

  await assert.rejects(
    processAIJob(
      createBullJob({
        opts: {
          attempts: 6,
        },
      })
    ),
    {
      code: "AI_RETRY_CONFIG_MISMATCH",
    }
  );

  assert.equal(
    databaseCalls.some(
      (call) => call.method === "aIJob.update"
    ),
    false
  );
});

// --------------------------------------------------
// JOB DISPATCH
// --------------------------------------------------

test("Unsupported AI job type is rejected and marked QUEUED", async () => {
  resetMocks();

  databaseJob = createDatabaseJob({
    jobType: "UNSUPPORTED_JOB",
  });

  await assert.rejects(
    processAIJob(
      createBullJob({
        name: "UNSUPPORTED_JOB",
      })
    ),
    {
      code: "AI_JOB_TYPE_UNSUPPORTED",
    }
  );

  const updateCall = databaseCalls.find(
    (call) => call.method === "aIJob.update"
  );

  assert.ok(updateCall);

  assert.equal(
    updateCall.query.data.status,
    "QUEUED"
  );
});

// --------------------------------------------------
// FAILURE HANDLING
// --------------------------------------------------

test("Original processing error is preserved if failure update fails", async () => {
  resetMocks();

  databaseJob = createDatabaseJob({
    jobType: "UNSUPPORTED_JOB",
  });

  databaseUpdateError = new Error("Database update failed");

  const originalError = await processAIJob(
    createBullJob({
      name: "UNSUPPORTED_JOB",
    })
  ).then(
    () => null,
    (error) => error
  );

  assert.equal(
    originalError.code,
    "AI_JOB_TYPE_UNSUPPORTED"
  );

  assert.notEqual(
    originalError.message,
    databaseUpdateError.message
  );
});

// --------------------------------------------------
// WRITING WORKFLOW TEST DATA
// --------------------------------------------------

function setupWritingWorkflow() {
  const submissionId = "writing-submission-123";

  databaseJob = createDatabaseJob({
    jobType: "WRITING_EVALUATION",
    inputPayload: {
      submissionId,
    },
  });

  writingSubmission = {
    id: submissionId,
    userId: "user-123",
    attemptId: "attempt-123",
    taskNumber: 1,
    responseText: "The chart illustrates the changes in sales.",
    wordCount: 120,
    attempt: {
      testVersionId: "test-version-123",
      usageType: "FULL_TEST",
      moduleId: null,
      partId: null,
    },
  };

  writingQuestions = [
    {
      id: "question-123",
      questionType: "REPORT",
      content: {
        task: "Summarise the information by selecting and reporting the main features.",
      },
    },
  ];

  writingPromptData = {
    prompt: "Evaluate this IELTS Writing response.",
    systemInstruction: "You are an IELTS examiner.",
  };

  writingFallbackResult = {
    text: JSON.stringify({
      overallBand: 7,
      feedback: "Good response.",
    }),
    model: "gemma-4-26b-a4b-it",
    usage: {
      inputTokens: 100,
      outputTokens: 200,
    },
  };
}

// --------------------------------------------------
// WRITING EVALUATION WORKFLOW
// --------------------------------------------------

test("Writing evaluation is processed and saved successfully", async () => {
  resetMocks();

  setupWritingWorkflow();

  const result = await processAIJob(
    createBullJob({
      name: "WRITING_EVALUATION",
    })
  );

  assert.deepEqual(result, {
    model: "gemma-4-26b-a4b-it",
    usage: {
      inputTokens: 100,
      outputTokens: 200,
    },
    evaluationCompleted: true,
  });

  // Verify existing evaluation lookup.
  assert.ok(
    databaseCalls.some(
      (call) =>
        call.method === "writingEvaluation.findFirst"
    )
  );

  // Verify submission lookup.
  const submissionCall = databaseCalls.find(
    (call) =>
      call.method === "writingSubmission.findFirst"
  );

  assert.ok(submissionCall);

  assert.deepEqual(
    submissionCall.query.where,
    {
      id: "writing-submission-123",
      userId: "user-123",
    }
  );

  // Verify question lookup.
  const questionCall = databaseCalls.find(
    (call) => call.method === "question.findMany"
  );

  assert.ok(questionCall);

  assert.equal(
    questionCall.query.where.testPart.testModule.testVersionId,
    "test-version-123"
  );

  assert.equal(
    questionCall.query.where.testPart.testModule.section,
    "WRITING"
  );

  // Verify prompt construction.
  assert.deepEqual(writingPromptCall, {
    taskNumber: 1,
    question:
      "Summarise the information by selecting and reporting the main features.",
    responseText:
      "The chart illustrates the changes in sales.",
    wordCount: 120,
  });

  // Verify fallback service invocation.
  assert.deepEqual(writingFallbackCall, {
    prompt: "Evaluate this IELTS Writing response.",
    systemInstruction: "You are an IELTS examiner.",
    generation: {
      temperature: 0.2,
      maxOutputTokens: 4096,
    },
  });

  // Verify evaluation persistence.
  assert.deepEqual(writingSaveCall, {
    submissionId: "writing-submission-123",
    aiResult: {
      text: writingFallbackResult.text,
      model: writingFallbackResult.model,
      usage: writingFallbackResult.usage,
    },
  });

  // Verify evaluation status update.
  assert.ok(
    databaseCalls.some(
      (call) =>
        call.method === "writingEvaluation.updateMany" &&
        call.query.data.status === "PROCESSING"
    )
  );

  // Verify AI job reaches PROCESSING and COMPLETED.
  const jobStatuses = databaseCalls
    .filter((call) => call.method === "aIJob.update")
    .map((call) => call.query.data.status);

  assert.ok(jobStatuses.includes("PROCESSING"));
  assert.ok(jobStatuses.includes("COMPLETED"));
});
