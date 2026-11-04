const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

const { prisma } = require("../../src/config/database");
const authService = require("../../src/modules/auth/services/auth.service");

test("login rejects an unknown email", async () => {
  const original = prisma.user.findUnique;

  prisma.user.findUnique = async () => null;

  try {
    await assert.rejects(
      authService.login({
        email: "missing@example.com",
        password: "StrongPassword123!",
      }),
      (error) => {
        assert.equal(error.statusCode, 401);
        assert.equal(error.code, "INVALID_CREDENTIALS");
        return true;
      }
    );
  } finally {
    prisma.user.findUnique = original;
  }
});

test("login rejects an incorrect password", async () => {
  const original = prisma.user.findUnique;

  const passwordHash = await bcrypt.hash("CorrectPassword123!", 4);

  prisma.user.findUnique = async () => ({
    id: "test-user-id",
    email: "user@example.com",
    passwordHash,
    platformRole: "USER",
    emailVerifiedAt: new Date(),
    isActive: true,
    createdAt: new Date(),
    profile: null,
  });

  try {
    await assert.rejects(
      authService.login({
        email: "user@example.com",
        password: "WrongPassword123!",
      }),
      (error) => {
        assert.equal(error.statusCode, 401);
        assert.equal(error.code, "INVALID_CREDENTIALS");
        return true;
      }
    );
  } finally {
    prisma.user.findUnique = original;
  }
});

test("login rejects an unverified account", async () => {
  const original = prisma.user.findUnique;
  const passwordHash = await bcrypt.hash("CorrectPassword123!", 4);

  prisma.user.findUnique = async () => ({
    id: "test-user-id",
    email: "user@example.com",
    passwordHash,
    platformRole: "USER",
    emailVerifiedAt: null,
    isActive: true,
    createdAt: new Date(),
    profile: null,
  });

  try {
    await assert.rejects(
      authService.login({
        email: "user@example.com",
        password: "CorrectPassword123!",
      }),
      (error) => {
        assert.equal(error.statusCode, 403);
        assert.equal(error.code, "EMAIL_NOT_VERIFIED");
        return true;
      }
    );
  } finally {
    prisma.user.findUnique = original;
  }
});

test("password reset rejects an unknown token", async () => {
  const original = prisma.passwordResetToken.findUnique;

  prisma.passwordResetToken.findUnique = async () => null;

  try {
    await assert.rejects(
      authService.resetPassword({
        token: "a".repeat(64),
        newPassword: "NewStrongPassword123!",
      }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, "INVALID_RESET_TOKEN");
        return true;
      }
    );
  } finally {
    prisma.passwordResetToken.findUnique = original;
  }
});

test("password reset rejects an expired token", async () => {
  const original = prisma.passwordResetToken.findUnique;

  prisma.passwordResetToken.findUnique = async () => ({
    id: "reset-token-id",
    userId: "test-user-id",
    expiresAt: new Date(Date.now() - 60_000),
    usedAt: null,
  });

  try {
    await assert.rejects(
      authService.resetPassword({
        token: "b".repeat(64),
        newPassword: "NewStrongPassword123!",
      }),
      (error) => {
        assert.equal(error.statusCode, 400);
        assert.equal(error.code, "INVALID_RESET_TOKEN");
        return true;
      }
    );
  } finally {
    prisma.passwordResetToken.findUnique = original;
  }
});
