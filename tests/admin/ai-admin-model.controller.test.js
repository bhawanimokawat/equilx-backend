
const { test } = require("node:test");
const assert = require("node:assert/strict");

const service = require("../../src/modules/admin/ai/services/ai-admin-model.service");

const controller = require("../../src/modules/admin/ai/controllers/ai-admin-model.controller");

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

function createRequest({
  params = {},
  body = {},
} = {}) {
  return { params, body };
}

test("GET models returns successful response", async (t) => {
  const models = [{ id: "model-1" }];

  t.mock.method(service, "listModels", async () => models);

  const res = createResponse();

  await controller.listModels(createRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, models);
});

test("POST model creates model and returns success", async (t) => {
  const payload = {
    provider: "gemini",
    modelName: "gemini-test",
  };

  t.mock.method(service, "createModel", async (data) => ({
    id: "model-1",
    ...data,
  }));

  const res = createResponse();

  await controller.createModel(
    createRequest({ body: payload }),
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.id, "model-1");
});

test("PATCH model passes model ID and body to service", async (t) => {
  let receivedId;
  let receivedBody;

  t.mock.method(service, "updateModel", async (id, body) => {
    receivedId = id;
    receivedBody = body;
    return { id, ...body };
  });

  const payload = { isActive: false };
  const res = createResponse();

  await controller.updateModel(
    createRequest({
      params: { modelId: "model-1" },
      body: payload,
    }),
    res
  );

  assert.equal(receivedId, "model-1");
  assert.deepEqual(receivedBody, payload);
  assert.equal(res.statusCode, 200);
});

test("POST route creates route successfully", async (t) => {
  const payload = {
    aiModelId: "model-1",
    purpose: "WRITING",
    priority: 1,
  };

  t.mock.method(service, "createRoute", async (data) => ({
    id: "route-1",
    ...data,
  }));

  const res = createResponse();

  await controller.createRoute(
    createRequest({ body: payload }),
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.id, "route-1");
});

test("PATCH route passes route ID and body to service", async (t) => {
  let receivedId;

  t.mock.method(service, "updateRoute", async (id, body) => {
    receivedId = id;
    return { id, ...body };
  });

  const res = createResponse();

  await controller.updateRoute(
    createRequest({
      params: { routeId: "route-1" },
      body: { priority: 5 },
    }),
    res
  );

  assert.equal(receivedId, "route-1");
  assert.equal(res.statusCode, 200);
});

test("DELETE route returns successful response", async (t) => {
  t.mock.method(service, "deleteRoute", async (id) => ({
    id,
    deleted: true,
  }));

  const res = createResponse();

  await controller.deleteRoute(
    createRequest({
      params: { routeId: "route-1" },
    }),
    res
  );

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.deleted, true);
});

test("Validation errors return their status code", async (t) => {
  const error = new Error("Invalid prompt data");
  error.statusCode = 400;

  t.mock.method(service, "createModel", async () => {
    throw error;
  });

  const res = createResponse();

  await controller.createModel(
    createRequest(),
    res
  );

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Invalid prompt data");
});

test("Duplicate database records return 409", async (t) => {
  const error = new Error("Unique constraint failed");
  error.code = "P2002";

  t.mock.method(service, "createModel", async () => {
    throw error;
  });

  const res = createResponse();

  await controller.createModel(createRequest(), res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
});

test("Invalid database identifiers return 400", async (t) => {
  const error = new Error("Invalid identifier");
  error.code = "P2023";

  t.mock.method(service, "updateModel", async () => {
    throw error;
  });

  const res = createResponse();

  await controller.updateModel(
    createRequest({
      params: { modelId: "invalid-id" },
      body: { isActive: false },
    }),
    res
  );

  assert.equal(res.statusCode, 400);
});

test("Unexpected errors return sanitized 500 response", async (t) => {
  t.mock.method(service, "listModels", async () => {
    throw new Error("Database password or internal details");
  });

  const res = createResponse();

  await controller.listModels(createRequest(), res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Internal server error.");
});
