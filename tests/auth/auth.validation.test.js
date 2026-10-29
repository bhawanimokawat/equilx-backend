const test = require("node:test");
const assert = require("node:assert/strict");

const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} = require("../../src/modules/auth/validation/auth.validation");

test("Register accepts valid data and normalizes email", () => {
  const result = registerSchema.safeParse({
    email: "  TEST@Example.com ",
    password: "StrongPassword123!",
    name: "Test User",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.email, "test@example.com");
});

test("Register rejects short passwords", () => {
  const result = registerSchema.safeParse({
    email: "test@example.com",
    password: "short",
  });

  assert.equal(result.success, false);
});

test("Register rejects client-supplied roles", () => {
  const result = registerSchema.safeParse({
    email: "test@example.com",
    password: "StrongPassword123!",
    role: "SUPER_ADMIN",
  });

  assert.equal(result.success, false);
});

test("Login accepts valid credentials", () => {
  assert.equal(
    loginSchema.safeParse({
      email: "TEST@example.com",
      password: "any-password",
    }).success,
    true
  );
});

test("Login rejects missing password", () => {
  assert.equal(
    loginSchema.safeParse({
      email: "test@example.com",
    }).success,
    false
  );
});

test("Forgot password accepts a valid email", () => {
  assert.equal(
    forgotPasswordSchema.safeParse({
      email: "test@example.com",
    }).success,
    true
  );
});

test("Reset password rejects a short new password", () => {
  assert.equal(
    resetPasswordSchema.safeParse({
      token: "a".repeat(32),
      newPassword: "short",
    }).success,
    false
  );
});

test("Change password requires both passwords", () => {
  assert.equal(
    changePasswordSchema.safeParse({
      currentPassword: "CurrentPassword123!",
      newPassword: "NewPassword123!",
    }).success,
    true
  );
});
