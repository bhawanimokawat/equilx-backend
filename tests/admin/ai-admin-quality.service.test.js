const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  createAIAdminQualityService,
} = require("../../src/modules/admin/ai/services/ai-admin-quality.service");

function createDatabaseMock() {
  return {
    writingEvaluation: {
      aggregate: async () => ({
        _count: { _all: 2 },
        _avg: {
          overallBand: 6.5,
          taskResponseBand: 6,
          coherenceBand: 6.5,
          lexicalBand: 7,
          grammarBand: 6,
        },
      }),

      groupBy: async () => [],
      findMany: async () => [],
    },

    speakingEvaluation: {
      aggregate: async () => ({
        _count: { _all: 1 },
        _avg: {
          overallBand: 7,
          fluencyBand: 7,
          lexicalBand: 7,
          grammarBand: 6.5,
          pronunciationBand: 7.5,
        },
      }),

      groupBy: async () => [],
      findMany: async () => [],
    },
  };
}

test("getSummary returns combined Writing and Speaking totals", async () => {
  const database = createDatabaseMock();

  database.writingEvaluation.groupBy = async () => [
    { status: "COMPLETED", _count: { _all: 1 } },
    { status: "PENDING", _count: { _all: 1 } },
  ];

  database.speakingEvaluation.groupBy = async () => [
    { status: "COMPLETED", _count: { _all: 1 } },
  ];

  const service = createAIAdminQualityService({ database });

  const result = await service.getSummary({});

  assert.equal(result.totalEvaluations, 3);
  assert.equal(result.completed, 2);
  assert.equal(result.pending, 1);
  assert.equal(result.processing, 0);
  assert.equal(result.failed, 0);
  assert.equal(result.needsReview, 0);

  assert.equal(result.writing.total, 2);
  assert.equal(result.speaking.total, 1);
  assert.equal(result.writing.averageOverallBand, 6.5);
  assert.equal(result.speaking.averageOverallBand, 7);
});

test("getBreakdown returns actual evaluation criteria averages", async () => {
  const database = createDatabaseMock();
  const service = createAIAdminQualityService({ database });

  const result = await service.getBreakdown({});

  assert.equal(result.writing.total, 2);
  assert.equal(result.writing.criteria.taskResponse, 6);
  assert.equal(result.writing.criteria.coherence, 6.5);
  assert.equal(result.writing.criteria.lexical, 7);
  assert.equal(result.writing.criteria.grammar, 6);
  assert.equal(result.writing.criteria.overall, 6.5);

  assert.equal(result.speaking.total, 1);
  assert.equal(result.speaking.criteria.fluency, 7);
  assert.equal(result.speaking.criteria.lexical, 7);
  assert.equal(result.speaking.criteria.grammar, 6.5);
  assert.equal(result.speaking.criteria.pronunciation, 7.5);
  assert.equal(result.speaking.criteria.overall, 7);
});

test("getBreakdown preserves null averages when no bands exist", async () => {
  const database = createDatabaseMock();

  database.writingEvaluation.aggregate = async () => ({
    _count: { _all: 0 },
    _avg: {
      taskResponseBand: null,
      coherenceBand: null,
      lexicalBand: null,
      grammarBand: null,
      overallBand: null,
    },
  });

  database.speakingEvaluation.aggregate = async () => ({
    _count: { _all: 0 },
    _avg: {
      fluencyBand: null,
      lexicalBand: null,
      grammarBand: null,
      pronunciationBand: null,
      overallBand: null,
    },
  });

  const service = createAIAdminQualityService({ database });

  const result = await service.getBreakdown({});

  assert.equal(result.writing.criteria.overall, null);
  assert.equal(result.speaking.criteria.overall, null);
  assert.equal(result.writing.criteria.taskResponse, null);
  assert.equal(result.speaking.criteria.fluency, null);
});

test("getTrends groups Writing and Speaking evaluations by UTC date", async () => {
  const database = createDatabaseMock();

  database.writingEvaluation.findMany = async () => [
    {
      createdAt: new Date("2026-11-20T10:00:00.000Z"),
      status: "COMPLETED",
      overallBand: 7,
    },
    {
      createdAt: new Date("2026-11-20T12:00:00.000Z"),
      status: "FAILED",
      overallBand: null,
    },
  ];

  database.speakingEvaluation.findMany = async () => [
    {
      createdAt: new Date("2026-11-20T15:00:00.000Z"),
      status: "COMPLETED",
      overallBand: 8,
    },
  ];

  const service = createAIAdminQualityService({ database });

  const result = await service.getTrends({});

  assert.equal(result.length, 1);
  assert.equal(result[0].date, "2026-11-20");
  assert.equal(result[0].writing, 2);
  assert.equal(result[0].speaking, 1);
  assert.equal(result[0].total, 3);
  assert.equal(result[0].completed, 2);
  assert.equal(result[0].failed, 1);
  assert.equal(result[0].averageOverallBand, 7.5);
});

test("getTrends returns null average when no bands exist", async () => {
  const database = createDatabaseMock();

  database.writingEvaluation.findMany = async () => [
    {
      createdAt: new Date("2026-11-20T10:00:00.000Z"),
      status: "PENDING",
      overallBand: null,
    },
  ];

  database.speakingEvaluation.findMany = async () => [];

  const service = createAIAdminQualityService({ database });

  const result = await service.getTrends({});

  assert.equal(result.length, 1);
  assert.equal(result[0].averageOverallBand, null);
});

test("quality analytics rejects invalid evaluation source", async () => {
  const database = createDatabaseMock();
  const service = createAIAdminQualityService({ database });

  await assert.rejects(
    () => service.getSummary({ source: "INVALID" }),
    /source/i
  );
});

test("quality analytics rejects invalid evaluation status", async () => {
  const database = createDatabaseMock();
  const service = createAIAdminQualityService({ database });

  await assert.rejects(
    () => service.getSummary({ status: "INVALID" }),
    /status/i
  );
});

test("quality analytics rejects invalid date filters", async () => {
  const database = createDatabaseMock();
  const service = createAIAdminQualityService({ database });

  await assert.rejects(
    () => service.getSummary({ from: "invalid-date" }),
    /date/i
  );
});

test("quality analytics rejects from date after to date", async () => {
  const database = createDatabaseMock();
  const service = createAIAdminQualityService({ database });

  await assert.rejects(
    () =>
      service.getSummary({
        from: "2026-11-25",
        to: "2026-11-20",
      }),
    /after/i
  );
});