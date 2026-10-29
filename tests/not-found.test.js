const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../src/app");

test("Unknown routes return HTTP 404 with a standard error response", async () => {
  const response = await request(app).get("/api/v1/does-not-exist");

  assert.equal(response.status, 404);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, "ROUTE_NOT_FOUND");
});

