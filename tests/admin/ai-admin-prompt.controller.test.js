const { test } = require("node:test");
const assert = require("node:assert/strict");

const service = require("../../src/modules/admin/ai/services/ai-admin-prompt.service");

const controller = require("../../src/modules/admin/ai/controllers/ai-admin-prompt.controller");

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

function createRequest({ params = {}, body = {} } = {}) {
  return { params, body };
}

test("GET prompts returns successful response", async (t) => {
  const prompts = [{ promptKey: "WRITING" }];

  t.mock.method(service, "listPrompts", async () => prompts);

  const res = createResponse();

  await controller.listPrompts(createRequest(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.deepEqual(res.body.data, prompts);
});

test("GET prompt history passes prompt key", async (t) => {
  let receivedKey;

  t.mock.method(service, "getPromptHistory", async (key) => {
    receivedKey = key;
    return [{ promptKey: key, version: 1 }];
  });

  const res = createResponse();

  await controller.getPromptHistory(
    createRequest({
      params: { promptKey: "WRITING" },
    }),
    res
  );

  assert.equal(receivedKey, "WRITING");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
});

test("POST prompt creates a new version with status 201", async (t) => {
  const payload = {
    promptKey: "WRITING",
    systemInstruction: "Evaluate writing.",
    promptTemplate: "Evaluate {{responseText}}",
  };

  t.mock.method(service, "createPrompt", async (data) => ({
    id: "prompt-1",
    ...data,
  }));

  const res = createResponse();

  await controller.createPrompt(
    createRequest({ body: payload }),
    res
  );

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(res.body.data.id, "prompt-1");
});

test("PATCH prompt updates a draft", async (t) => {
  let receivedId;
  let receivedBody;

  t.mock.method(service, "updatePromptDraft", async (id, body) => {
    receivedId = id;
    receivedBody = body;
    return { id, ...body };
  });

  const payload = {
    systemInstruction: "Updated instruction.",
  };

  const res = createResponse();

  await controller.updatePromptDraft(
    createRequest({
      params: { promptId: "prompt-1" },
      body: payload,
    }),
    res
  );

  assert.equal(receivedId, "prompt-1");
  assert.deepEqual(receivedBody, payload);
  assert.equal(res.statusCode, 200);
});

test("POST publish activates the selected prompt version", async (t) => {
  let receivedId;

  t.mock.method(service, "activatePrompt", async (id) => {
    receivedId = id;
    return { id, isActive: true };
  });

  const res = createResponse();

  await controller.publishPrompt(
    createRequest({
      params: { promptId: "prompt-2" },
    }),
    res
  );

  assert.equal(receivedId, "prompt-2");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.isActive, true);
});

test("POST rollback reactivates the selected older version", async (t) => {
  let receivedId;

  t.mock.method(service, "activatePrompt", async (id) => {
    receivedId = id;
    return { id, isActive: true };
  });

  const res = createResponse();

  await controller.rollbackPrompt(
    createRequest({
      params: { promptId: "prompt-old" },
    }),
    res
  );

  assert.equal(receivedId, "prompt-old");
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.isActive, true);
});

test("Duplicate prompt versions return 409", async (t) => {
  const error = new Error("Duplicate version");
  error.code = "P2002";

  t.mock.method(service, "createPrompt", async () => {
    throw error;
  });

  const res = createResponse();

  await controller.createPrompt(createRequest(), res);

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.success, false);
  assert.equal(
    res.body.message,
    "This prompt version already exists."
  );
});

test("Prompt not found returns 404", async (t) => {
  const error = new Error("Prompt not found.");
  error.statusCode = 404;

  t.mock.method(service, "getPromptHistory", async () => {
    throw error;
  });

  const res = createResponse();

  await controller.getPromptHistory(
    createRequest({
      params: { promptKey: "UNKNOWN" },
    }),
    res
  );

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Prompt not found.");
});

test("Validation errors return their status code", async (t) => {
  const error = new Error("Invalid prompt content.");
  error.statusCode = 400;

  t.mock.method(service, "createPrompt", async () => {
    throw error;
  });

  const res = createResponse();

  await controller.createPrompt(createRequest(), res);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Invalid prompt content.");
});

test("Unexpected errors return sanitized 500 response", async (t) => {
  t.mock.method(service, "listPrompts", async () => {
    throw new Error("Internal database details");
  });

  const res = createResponse();

  await controller.listPrompts(createRequest(), res);

  assert.equal(res.statusCode, 500);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, "Internal server error.");
});
