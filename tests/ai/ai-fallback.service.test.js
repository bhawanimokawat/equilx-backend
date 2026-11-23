
const { test } = require("node:test");
const assert = require("node:assert/strict");

const aiConfig = require("../../src/modules/ai/config/ai.config");

const {
  createAIFallbackService,
  isRetryableError,
} = require("../../src/modules/ai/services/ai-fallback.service");

const writingModel = aiConfig.gemini.model;
const secondWritingModel = "gemma-4-test-fallback";

function createRoute({
  id,
  modelName,
  priority,
  isActive = true,
  provider = "gemini",
}) {
  return {
    id,
    priority,
    aiModel: {
      id: `model-${id}`,
      provider,
      modelName,
      isActive,
    },
  };
}

function createTestService({
  routes = [],
  providerMethods = {},
  config = aiConfig,
} = {}) {
  const calls = [];

  const database = {
    aIModelRoute: {
      async findMany(query) {
        calls.push({ type: "database", query });
        return routes;
      },
    },
  };

  const provider = {
    async generateText(options) {
      calls.push({ type: "provider", method: "generateText", options });

      if (providerMethods.generateText) {
        return providerMethods.generateText(options);
      }

      throw new Error("Unexpected generateText call");
    },

    async transcribeAudio(options) {
      calls.push({ type: "provider", method: "transcribeAudio", options });

      if (providerMethods.transcribeAudio) {
        return providerMethods.transcribeAudio(options);
      }

      throw new Error("Unexpected transcribeAudio call");
    },

    async generateAudioEvaluation(options) {
      calls.push({
        type: "provider",
        method: "generateAudioEvaluation",
        options,
      });

      if (providerMethods.generateAudioEvaluation) {
        return providerMethods.generateAudioEvaluation(options);
      }

      throw new Error("Unexpected generateAudioEvaluation call");
    },
  };

  const service = createAIFallbackService({
    database,
    provider,
    config,
  });

  return { service, calls };
}

function createConfigWithFallbackModel() {
  return {
    ...aiConfig,
    gemini: {
      ...aiConfig.gemini,
      modelCatalog: [
        ...aiConfig.gemini.modelCatalog,
        {
          modelName: secondWritingModel,
          purposes: ["WRITING"],
        },
      ],
    },
  };
}

test("AI routes are fetched in ascending priority order", async () => {
  const routes = [
    createRoute({
      id: "route-2",
      modelName: writingModel,
      priority: 10,
    }),
    createRoute({
      id: "route-1",
      modelName: writingModel,
      priority: 0,
    }),
  ];

  const { service, calls } = createTestService({ routes });

  const result = await service.getModelRoutes("WRITING");

  assert.equal(result.length, 2);

  assert.deepEqual(calls[0].query.orderBy, [
    { priority: "asc" },
    { id: "asc" },
  ]);
});

test("Unapproved models are excluded from routing", async () => {
  const routes = [
    createRoute({
      id: "route-approved",
      modelName: writingModel,
      priority: 0,
    }),
    createRoute({
      id: "route-unapproved",
      modelName: "unapproved-test-model",
      priority: 10,
    }),
  ];

  const { service } = createTestService({ routes });

  const result = await service.getModelRoutes("WRITING");

  assert.equal(result.length, 1);
  assert.equal(result[0].aiModel.modelName, writingModel);
});

test("Inactive models are excluded from routing", async () => {
  const routes = [
    createRoute({
      id: "route-inactive",
      modelName: writingModel,
      priority: 0,
      isActive: false,
    }),
  ];

  const { service } = createTestService({ routes });

  await assert.rejects(
    service.getModelRoutes("WRITING"),
    { code: "AI_MODEL_ROUTE_NOT_FOUND" }
  );
});

test("Routes from unsupported providers are excluded", async () => {
  const routes = [
    createRoute({
      id: "route-other-provider",
      modelName: writingModel,
      priority: 0,
      provider: "openai",
    }),
  ];

  const { service } = createTestService({ routes });

  await assert.rejects(
    service.getModelRoutes("WRITING"),
    { code: "AI_MODEL_ROUTE_NOT_FOUND" }
  );
});

test("No configured routes produces a controlled error", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.getModelRoutes("WRITING"),
    { code: "AI_MODEL_ROUTE_NOT_FOUND" }
  );
});

test("429 errors are retryable", () => {
  const error = new Error("Rate limit exceeded");
  error.status = 429;

  assert.equal(isRetryableError(error), true);
});

test("503 errors are retryable", () => {
  const error = new Error("Service unavailable");
  error.status = 503;

  assert.equal(isRetryableError(error), true);
});

test("Network timeout errors are retryable", () => {
  const error = new Error("Connection timed out");
  error.code = "ETIMEDOUT";

  assert.equal(isRetryableError(error), true);
});

test("Nested network errors are retryable", () => {
  const error = new Error("Provider request failed", {
    cause: Object.assign(new Error("Connection reset"), {
      code: "ECONNRESET",
    }),
  });

  assert.equal(isRetryableError(error), true);
});

test("Authentication errors are not retryable", () => {
  const error = new Error("Unauthorized");
  error.status = 401;

  assert.equal(isRetryableError(error), false);
});

test("Invalid request errors are not retryable", () => {
  const error = new Error("Invalid request");
  error.status = 400;

  assert.equal(isRetryableError(error), false);
});

test("Writing returns the successful model and usage", async () => {
  const routes = [
    createRoute({
      id: "route-writing",
      modelName: writingModel,
      priority: 0,
    }),
  ];

  const { service, calls } = createTestService({
    routes,
    providerMethods: {
      generateText: async ({ model }) => ({
        text: "Test evaluation",
        model,
        usage: {
          inputTokens: 100,
          outputTokens: 50,
          totalTokens: 150,
        },
      }),
    },
  });

  const result = await service.generateTextWithFallback({
    prompt: "Test writing prompt",
  });

  assert.equal(result.text, "Test evaluation");
  assert.equal(result.model, writingModel);
  assert.equal(result.fallback, false);

  assert.deepEqual(result.usage, {
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
  });

  assert.deepEqual(result.attemptedModels, [writingModel]);

  const providerCall = calls.find((call) => call.type === "provider");

  assert.equal(providerCall.options.model, writingModel);
});

test("Retryable failure switches to the next configured model", async () => {
  const routes = [
    createRoute({
      id: "route-primary",
      modelName: writingModel,
      priority: 0,
    }),
    createRoute({
      id: "route-fallback",
      modelName: secondWritingModel,
      priority: 10,
    }),
  ];

  const attemptedModels = [];

  const { service } = createTestService({
    routes,
    config: createConfigWithFallbackModel(),
    providerMethods: {
      generateText: async ({ model }) => {
        attemptedModels.push(model);

        if (model === writingModel) {
          const error = new Error("Rate limit exceeded");
          error.status = 429;
          throw error;
        }

        return {
          text: "Fallback evaluation",
          model,
          usage: {
            inputTokens: 80,
            outputTokens: 40,
            totalTokens: 120,
          },
        };
      },
    },
  });

  const result = await service.generateTextWithFallback({
    prompt: "Test fallback prompt",
  });

  assert.equal(result.text, "Fallback evaluation");
  assert.equal(result.model, secondWritingModel);
  assert.equal(result.fallback, true);

  assert.deepEqual(attemptedModels, [
    writingModel,
    secondWritingModel,
  ]);

  assert.deepEqual(result.attemptedModels, [
    writingModel,
    secondWritingModel,
  ]);
});

test("Non-retryable failure does not switch models", async () => {
  const routes = [
    createRoute({
      id: "route-primary",
      modelName: writingModel,
      priority: 0,
    }),
    createRoute({
      id: "route-fallback",
      modelName: secondWritingModel,
      priority: 10,
    }),
  ];

  let callCount = 0;

  const { service } = createTestService({
    routes,
    config: createConfigWithFallbackModel(),
    providerMethods: {
      generateText: async () => {
        callCount += 1;

        const error = new Error("Unauthorized");
        error.status = 401;
        throw error;
      },
    },
  });

  await assert.rejects(
    service.generateTextWithFallback({
      prompt: "Test prompt",
    }),
    (error) => {
      assert.equal(error.code, "AI_ALL_MODELS_FAILED");
      assert.equal(error.retryable, false);
      assert.deepEqual(error.attemptedModels, [writingModel]);

      return true;
    }
  );

  assert.equal(callCount, 1);
});
