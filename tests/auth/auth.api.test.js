const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");

const app = require("../../src/app");

test("POST /register rejects a short password", async () => {
  const response = await request(app)
    .post("/api/v1/auth/register")
    .send({
      email: "invalid-password@example.com",
      password: "short",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /login rejects a missing password", async () => {
  const response = await request(app)
    .post("/api/v1/auth/login")
    .send({
      email: "test@example.com",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /verify-email rejects an invalid OTP format", async () => {
  const response = await request(app)
    .post("/api/v1/auth/verify-email")
    .send({
      email: "test@example.com",
      otp: "12",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /reset-password rejects a short new password", async () => {
  const response = await request(app)
    .post("/api/v1/auth/reset-password")
    .send({
      token: "a".repeat(32),
      newPassword: "short",
    });

  assert.equal(response.status, 400);
  assert.equal(response.body.success, false);
});

test("POST /refresh rejects a missing refresh token", async () => {
  const response = await request(app)
    .post("/api/v1/auth/refresh");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("GET /me rejects a request without an access token", async () => {
  const response = await request(app)
    .get("/api/v1/auth/me");

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});

test("PATCH /change-password requires authentication", async () => {
  const response = await request(app)
    .patch("/api/v1/auth/change-password")
    .send({
      currentPassword: "CurrentPassword123!",
      newPassword: "NewPassword123!",
    });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
});
