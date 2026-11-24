
const { test } = require("node:test");
const assert = require("node:assert/strict");

const service = require("../../src/modules/admin/ai/services/ai-admin-settings.service");

const controller = require("../../src/modules/admin/ai/controllers/ai-admin-settings.controller");

function createResponse() {
  return {
    statusCode: 200,
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

function createRequest(body = {}) {
  return { body };
}

test("GET config returns successful response", async (t) => {
  const config = { temperature: 0.2, maxOutputTokens: 4096 };

  t.mock.method(service, "getConfig", async () => config);

  const res = createResponse();

  await controller.getConfig(createRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, config);
});

test("PATCH config passes request body to service", async (t) => {
  const payload = { temperature: 0.8 };
  let receivedBody;

  t.mock.method(service, "updateConfig", async (body) => {
    receivedBody = body;
    return { ...body };
  });

  const res = createResponse();

  await controller.updateConfig(createRequest(payload), res);

  assert.deepEqual(receivedBody, payload);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.temperature, 0.8);
});

test("GET limits returns successful response", async (t) => {
  const limits = { dailyBudget: 100, freeDailyLimit: 20 };

  t.mock.method(service, "getLimits", async () => limits);

  const res = createResponse();

  await controller.getLimits(createRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, limits);
});

test("PATCH limits passes request body to service", async (t) => {
  const payload = { dailyBudget: 500, freeDailyLimit: 30 };
  let receivedBody;

  t.mock.method(service, "updateLimits", async (body) => {
    receivedBody = body;
    return { ...body };
  });

  const res = createResponse();

  await controller.updateLimits(createRequest(payload), res);

  assert.deepEqual(receivedBody, payload);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.dailyBudget, 500);
});

test("Validation errors return their status code", async (t) => {
  const error = new Error("Temperature is invalid.");
  error.statusCode = 400;

  t.mock.method(service, "updateConfig", async () => {
    throw error;
  });

  const res = createResponse();

  await controller.updateConfig(createRequest({ temperature: 5 }), res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Temperature is invalid.");
});

test("Invalid database identifiers return 400", async (t) => {
  const error = new Error("Invalid database identifier.");
  error.code = "P2023";

  t.mock.method(service, "updateLimits", async () => {
    throw error;
  });

  const res = createResponse();

  await controller.updateLimits(createRequest({ dailyBudget: 100 }), res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
});

test("Duplicate settings return 409", async (t) => {
  const error = new Error("Unique constraint failed.");
  error.code = "P2002";

  t.mock.method(service, "updateConfig", async () => {
    throw error;
  });

  const res = createResponse();

  await controller.updateConfig(createRequest({ temperature: 0.5 }), res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
});

test("Unexpected errors return sanitized 500 response", async (t) => {
  t.mock.method(service, "getConfig", async () => {
    throw new Error("Internal database details");
  });

  const res = createResponse();

  await controller.getConfig(createRequest(), res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Internal server error.");
});
