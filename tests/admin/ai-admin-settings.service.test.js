
const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  createAIAdminSettingsService,
} = require("../../src/modules/admin/ai/services/ai-admin-settings.service");

function createTestService() {
  let record = null;

  const defaults = {
    id: "00000000-0000-4000-8000-000000000001",
    defaultProvider: "gemini",
    defaultModel: "gemini-test",
    writingModel: "gemini-writing",
    speakingModel: "gemini-speaking",
    transcriptionModel: "gemini-transcription",
    temperature: 0.2,
    maxOutputTokens: 4096,
    dailyBudget: 100,
    monthlyBudget: 1000,
    freeDailyLimit: 20,
    proDailyLimit: 100,
    instituteDailyLimit: 500,
    alertsEnabled: true,
    evaluationEnabled: true,
    loggingEnabled: true,
    updatedAt: new Date(),
  };

  const database = {
    aISettings: {
      async upsert(args) {
        if (!record) {
          record = { ...args.create };
          for (const [key, value] of Object.entries(defaults)) {
            if (record[key] === undefined) record[key] = value;
          }
        }

        return { ...record };
      },

      async update(args) {
        if (!record) {
          const error = new Error("Record not found");
          error.code = "P2025";
          throw error;
        }

        record = {
          ...record,
          ...args.data,
          updatedAt: new Date(),
        };

        return { ...record };
      },
    },
  };

  return {
    service: createAIAdminSettingsService({ database }),
    getRecord: () => record,
  };
}

test("GET config initializes settings and returns configuration", async () => {
  const { service } = createTestService();

  const result = await service.getConfig();

  assert.equal(result.defaultProvider, "gemini");
  assert.equal(result.temperature, 0.2);
  assert.equal(result.maxOutputTokens, 4096);
  assert.equal("dailyBudget" in result, false);
  assert.equal("apiKey" in result, false);
});

test("GET limits returns budget and tier limits", async () => {
  const { service } = createTestService();

  const result = await service.getLimits();

  assert.equal(result.dailyBudget, 100);
  assert.equal(result.monthlyBudget, 1000);
  assert.equal(result.freeDailyLimit, 20);
  assert.equal(result.proDailyLimit, 100);
  assert.equal(result.instituteDailyLimit, 500);
});

test("PATCH config updates supported fields", async () => {
  const { service } = createTestService();

  const result = await service.updateConfig({
    temperature: 0.7,
    maxOutputTokens: 2048,
    evaluationEnabled: false,
  });

  assert.equal(result.temperature, 0.7);
  assert.equal(result.maxOutputTokens, 2048);
  assert.equal(result.evaluationEnabled, false);
});

test("PATCH config rejects unsupported provider", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.updateConfig({ defaultProvider: "openai" }),
    {
      message: "Only the Gemini provider is currently supported.",
      statusCode: 400,
    }
  );
});

test("PATCH config rejects invalid temperature", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.updateConfig({ temperature: 3 }),
    { statusCode: 400 }
  );
});

test("PATCH config rejects invalid token limit", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.updateConfig({ maxOutputTokens: 1.5 }),
    { statusCode: 400 }
  );
});

test("PATCH config rejects empty model names", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.updateConfig({ writingModel: "  " }),
    { statusCode: 400 }
  );
});

test("PATCH config rejects empty updates", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.updateConfig({}),
    { statusCode: 400 }
  );
});

test("PATCH limits updates budgets and tier limits", async () => {
  const { service } = createTestService();

  const result = await service.updateLimits({
    dailyBudget: 250,
    monthlyBudget: 5000,
    freeDailyLimit: 30,
    proDailyLimit: 150,
    instituteDailyLimit: 700,
    alertsEnabled: false,
  });

  assert.equal(result.dailyBudget, 250);
  assert.equal(result.monthlyBudget, 5000);
  assert.equal(result.freeDailyLimit, 30);
  assert.equal(result.proDailyLimit, 150);
  assert.equal(result.instituteDailyLimit, 700);
  assert.equal(result.alertsEnabled, false);
});

test("PATCH limits rejects negative budgets", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.updateLimits({ dailyBudget: -100 }),
    { statusCode: 400 }
  );
});

test("PATCH limits rejects fractional tier limits", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.updateLimits({ freeDailyLimit: 10.5 }),
    { statusCode: 400 }
  );
});

test("PATCH limits rejects empty updates", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.updateLimits({}),
    { statusCode: 400 }
  );
});
