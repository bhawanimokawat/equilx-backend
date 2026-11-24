
const { test } = require("node:test");
const assert = require("node:assert/strict");

const service = require("../../src/modules/admin/ai/services/ai-admin-quality.service");
const controller = require("../../src/modules/admin/ai/controllers/ai-admin-quality.controller");

function createResponse() {
  return {
    statusCode: null,
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.body = data;
      return this;
    },
  };
}

test("GET quality summary returns successful response", async (t) => {
  const expected = { totalEvaluations: 10 };

  t.mock.method(service, "getSummary", async () => expected);

  const req = { query: { from: "2026-11-01" } };
  const res = createResponse();

  await controller.getSummary(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    data: expected,
  });
});

test("GET quality breakdown returns successful response", async (t) => {
  const expected = { writing: {}, speaking: {} };

  t.mock.method(service, "getBreakdown", async () => expected);

  const req = { query: {} };
  const res = createResponse();

  await controller.getBreakdown(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    data: expected,
  });
});

test("GET quality trends returns successful response", async (t) => {
  const expected = [{ date: "2026-11-23", total: 5 }];

  t.mock.method(service, "getTrends", async () => expected);

  const req = { query: { to: "2026-11-23" } };
  const res = createResponse();

  await controller.getTrends(req, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, {
    success: true,
    data: expected,
  });
});

test("quality controller returns validation errors", async (t) => {
  t.mock.method(service, "getSummary", async () => {
    const error = new Error("Invalid date range.");
    error.statusCode = 400;
    throw error;
  });

  const req = { query: { from: "invalid-date" } };
  const res = createResponse();

  await controller.getSummary(req, res);

  assert.equal(res.statusCode, 400);
  assert.deepEqual(res.body, {
    success: false,
    message: "Invalid date range.",
  });
});

test("quality controller hides unexpected internal errors", async (t) => {
  t.mock.method(service, "getSummary", async () => {
    throw new Error("Database connection details");
  });

  const req = { query: {} };
  const res = createResponse();

  await controller.getSummary(req, res);

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    success: false,
    message: "Internal server error.",
  });
});
