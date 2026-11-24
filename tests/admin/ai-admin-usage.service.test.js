const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  createAIAdminUsageService,
} = require("../../src/modules/admin/ai/services/ai-admin-usage.service");

function createDatabaseMock() {
  return {
    aIUsageLog: {
      aggregate: async () => ({
        _count: { _all: 2 },
        _sum: {
          inputTokens: 100,
          outputTokens: 200,
          estimatedCost: null,
        },
      }),

      groupBy: async () => [],

      findMany: async () => [],
    },

    aIModel: {
      findMany: async () => [],
    },
  };
}

test("getSummary returns token totals and keeps missing cost as null", async () => {
  const database = createDatabaseMock();

  database.aIUsageLog.groupBy = async () => [
    {
      currency: "USD",
      _count: { _all: 2 },
      _sum: { estimatedCost: null },
    },
  ];

  const service = createAIAdminUsageService({ database });

  const result = await service.getSummary({});

  assert.equal(result.totalRequests, 2);
  assert.equal(result.inputTokens, 100);
  assert.equal(result.outputTokens, 200);
  assert.equal(result.totalTokens, 300);
  assert.equal(result.estimatedCost, null);
  assert.equal(result.currencies.length, 1);
  assert.equal(result.currencies[0].currency, "USD");
});

test("getBreakdown maps model details to usage groups", async () => {
  const database = createDatabaseMock();

  database.aIUsageLog.groupBy = async () => [
    {
      aiModelId: "model-1",
      jobType: "WRITING",
      currency: "USD",
      _count: { _all: 3 },
      _sum: {
        inputTokens: 100,
        outputTokens: 200,
        estimatedCost: 0.25,
      },
    },
  ];

  database.aIModel.findMany = async () => [
    {
      id: "model-1",
      provider: "gemini",
      modelName: "gemini-test",
    },
  ];

  const service = createAIAdminUsageService({ database });

  const result = await service.getBreakdown({});

  assert.equal(result.length, 1);
  assert.equal(result[0].model.provider, "gemini");
assert.equal(result[0].model.modelName, "gemini-test");
  assert.equal(result[0].jobType, "WRITING");
  assert.equal(result[0].requests, 3);
});

test("getTrends groups usage by UTC date and currency", async () => {
  const database = createDatabaseMock();

  database.aIUsageLog.findMany = async () => [
    {
      createdAt: new Date("2026-11-20T10:00:00.000Z"),
      inputTokens: 100,
      outputTokens: 200,
      estimatedCost: null,
      currency: "USD",
    },
    {
      createdAt: new Date("2026-11-20T12:00:00.000Z"),
      inputTokens: 50,
      outputTokens: 50,
      estimatedCost: null,
      currency: "USD",
    },
  ];

  const service = createAIAdminUsageService({ database });

  const result = await service.getTrends({});

  assert.equal(result.length, 1);
  assert.equal(result[0].date, "2026-11-20");
  assert.equal(result[0].requests, 2);
  assert.equal(result[0].inputTokens, 150);
  assert.equal(result[0].outputTokens, 250);
  assert.equal(result[0].estimatedCost, null);
});

test("exportUsage returns CSV with headers", async () => {
  const database = createDatabaseMock();

  database.aIUsageLog.findMany = async () => [
    {
      id: "usage-1",
      userId: "user-1",
      jobType: "WRITING",
      inputTokens: 100,
      outputTokens: 200,
      estimatedCost: 0.25,
      currency: "USD",
      createdAt: new Date("2026-11-20T10:00:00.000Z"),
      model: {
        provider: "gemini",
        modelName: "gemini-test",
      },
    },
  ];

  const service = createAIAdminUsageService({ database });

  const result = await service.exportUsage({});

  assert.match(result, /^id,userId,provider,modelName/);
  assert.match(result, /usage-1/);
  assert.match(result, /gemini-test/);
  assert.match(result, /WRITING/);
});

test("getSummary rejects invalid date filters", async () => {
  const database = createDatabaseMock();
  const service = createAIAdminUsageService({ database });

  await assert.rejects(
    () => service.getSummary({ from: "invalid-date" }),
    /date/i
  );
});

test("getSummary rejects when from date is after to date", async () => {
  const database = createDatabaseMock();
  const service = createAIAdminUsageService({ database });

  await assert.rejects(
    () =>
      service.getSummary({
        from: "2026-11-25",
        to: "2026-11-20",
      }),
    /after|before|range/i
  );
});

test("getSummary rejects unsupported job types", async () => {
  const database = createDatabaseMock();
  const service = createAIAdminUsageService({ database });

  await assert.rejects(
    () => service.getSummary({ jobType: "INVALID" }),
    /jobType|job type/i
  );
});