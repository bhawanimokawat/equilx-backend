
const test = require("node:test");
const assert = require("node:assert/strict");

const { requireAuth } = require("../../src/middleware/auth.middleware");

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("requireAuth rejects a missing Authorization header", async () => {
  const req = { headers: {} };
  const res = createResponse();
  let nextCalled = false;

  await requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, "AUTHENTICATION_REQUIRED");
  assert.equal(nextCalled, false);
});

test("requireAuth rejects an invalid Bearer token", async () => {
  const req = {
    headers: {
      authorization: "Bearer invalid-token",
    },
  };
  const res = createResponse();
  let nextCalled = false;

  await requireAuth(req, res, () => {
    nextCalled = true;
  });

  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, "INVALID_ACCESS_TOKEN");
  assert.equal(nextCalled, false);
});
