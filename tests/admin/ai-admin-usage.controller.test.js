const { test } = require("node:test");
const assert = require("node:assert/strict");

const service = require("../../src/modules/admin/ai/services/ai-admin-usage.service");
const controller = require("../../src/modules/admin/ai/controllers/ai-admin-usage.controller");

function createResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,

    status(code) {
      this.statusCode = code;
      return this;
    },

    json(data) {
      this.body = data;
      return this;
    },

    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    },

    send(data) {
      this.body = data;
      return this;
    },
  };
}

test("getSummary returns usage summary", async (t) => {
  t.mock.method(service, "getSummary", async () => ({
    totalRequests: 10,
    totalTokens: 500,
  }));

  const req = { query: {} };
  const res = createResponse();

  await controller.getSummary(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.totalRequests, 10);
});

test("getBreakdown returns usage breakdown", async (t) => {
  t.mock.method(service, "getBreakdown", async () => [
    { jobType: "WRITING", requests: 5 },
  ]);

  const req = { query: { jobType: "WRITING" } };
  const res = createResponse();

  await controller.getBreakdown(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data[0].jobType, "WRITING");
});

test("getTrends returns usage trends", async (t) => {
  t.mock.method(service, "getTrends", async () => [
    { date: "2026-11-20", requests: 5 },
  ]);

  const req = { query: {} };
  const res = createResponse();

  await controller.getTrends(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data[0].requests, 5);
});

test("exportUsage returns CSV download", async (t) => {
  t.mock.method(service, "exportUsage", async () => "id,jobType\n1,WRITING");

  const req = { query: {} };
  const res = createResponse();

  await controller.exportUsage(req, res);

  assert.equal(res.statusCode, 200);
  assert.equal(
    res.headers["Content-Type"],
    "text/csv; charset=utf-8"
  );
  assert.match(res.headers["Content-Disposition"], /equilx-ai-usage\.csv/);
  assert.match(res.body, /WRITING/);
});

test("getSummary returns validation error status", async (t) => {
  const error = new Error("Invalid date filter.");
  error.statusCode = 400;

  t.mock.method(service, "getSummary", async () => {
    throw error;
  });

  const req = { query: {} };
  const res = createResponse();

  await controller.getSummary(req, res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Invalid date filter.");
});

test("getSummary hides internal server errors", async (t) => {
  t.mock.method(service, "getSummary", async () => {
    throw new Error("Database connection password leaked");
  });

  const req = { query: {} };
  const res = createResponse();

  await controller.getSummary(req, res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Internal server error.");
});