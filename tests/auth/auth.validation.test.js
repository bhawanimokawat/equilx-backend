const test = require("node:test");
const assert = require("node:assert/strict");

const {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshSchema,
  verifyEmailSchema,
  resendOtpSchema,
} = require("../../src/modules/auth/validation/auth.validation");

const validPassword = "StrongPassword123!";
const validEmail = "test@example.com";

// REGISTER
test("Register accepts valid data and normalizes email", () => {
  const result = registerSchema.safeParse({
    name: "Test User",
    email: "  TEST@Example.com ",
    password: validPassword,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.email, validEmail);
  assert.equal(result.data.name, "Test User");
});

test("Register trims the user's name", () => {
  const result = registerSchema.safeParse({
    name: "  Test User  ",
    email: validEmail,
    password: validPassword,
  });

  assert.equal(result.success, true);
  assert.equal(result.data.name, "Test User");
});

test("Register rejects missing required fields", () => {
  const result = registerSchema.safeParse({});

  assert.equal(result.success, false);
});

test("Register rejects invalid email", () => {
  const result = registerSchema.safeParse({
    name: "Test User",
    email: "invalid-email",
    password: validPassword,
  });

  assert.equal(result.success, false);
});

test("Register rejects passwords shorter than 12 characters", () => {
  const result = registerSchema.safeParse({
    name: "Test User",
    email: validEmail,
    password: "Short123!",
  });

  assert.equal(result.success, false);
});

test("Register accepts a password of exactly 12 characters", () => {
  const result = registerSchema.safeParse({
    name: "Test User",
    email: validEmail,
    password: "Abcdef123!XY",
  });

  assert.equal(result.success, true);
});

test("Register rejects passwords longer than 128 characters", () => {
  const result = registerSchema.safeParse({
    name: "Test User",
    email: validEmail,
    password: "A".repeat(129),
  });

  assert.equal(result.success, false);
});

test("Register rejects empty or excessively long names", () => {
  const emptyName = registerSchema.safeParse({
    name: "   ",
    email: validEmail,
    password: validPassword,
  });

  const longName = registerSchema.safeParse({
    name: "A".repeat(101),
    email: validEmail,
    password: validPassword,
  });

  assert.equal(emptyName.success, false);
  assert.equal(longName.success, false);
});

test("Register rejects unexpected fields including platform roles", () => {
  const result = registerSchema.safeParse({
    name: "Test User",
    email: validEmail,
    password: validPassword,
    role: "SUPER_ADMIN",
    platformRole: "SUPER_ADMIN",
    isActive: true,
  });

  assert.equal(result.success, false);
});

test("Register rejects emails exceeding 254 characters", () => {
  const result = registerSchema.safeParse({
    name: "Test User",
    email: `${"a".repeat(243)}@example.com`,
    password: validPassword,
  });

  assert.equal(result.success, false);
});

// LOGIN
test("Login accepts valid credentials", () => {
  const result = loginSchema.safeParse({
    email: "TEST@example.com",
    password: "any-password",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.email, validEmail);
});

test("Login rejects missing password", () => {
  const result = loginSchema.safeParse({
    email: validEmail,
  });

  assert.equal(result.success, false);
});

test("Login rejects empty password", () => {
  const result = loginSchema.safeParse({
    email: validEmail,
    password: "",
  });

  assert.equal(result.success, false);
});

test("Login rejects unexpected fields", () => {
  const result = loginSchema.safeParse({
    email: validEmail,
    password: validPassword,
    platformRole: "SUPER_ADMIN",
  });

  assert.equal(result.success, false);
});

// FORGOT PASSWORD
test("Forgot password accepts a valid email", () => {
  const result = forgotPasswordSchema.safeParse({
    email: validEmail,
  });

  assert.equal(result.success, true);
});

test("Forgot password rejects invalid email", () => {
  const result = forgotPasswordSchema.safeParse({
    email: "invalid",
  });

  assert.equal(result.success, false);
});

test("Forgot password rejects unexpected fields", () => {
  const result = forgotPasswordSchema.safeParse({
    email: validEmail,
    userId: "123",
  });

  assert.equal(result.success, false);
});

// RESET PASSWORD
test("Reset password accepts valid token and password", () => {
  const result = resetPasswordSchema.safeParse({
    token: "a".repeat(32),
    newPassword: validPassword,
  });

  assert.equal(result.success, true);
});

test("Reset password rejects short tokens", () => {
  const result = resetPasswordSchema.safeParse({
    token: "short",
    newPassword: validPassword,
  });

  assert.equal(result.success, false);
});

test("Reset password rejects tokens longer than 512 characters", () => {
  const result = resetPasswordSchema.safeParse({
    token: "a".repeat(513),
    newPassword: validPassword,
  });

  assert.equal(result.success, false);
});

test("Reset password rejects weak passwords", () => {
  const result = resetPasswordSchema.safeParse({
    token: "a".repeat(32),
    newPassword: "weak",
  });

  assert.equal(result.success, false);
});

// CHANGE PASSWORD
test("Change password accepts valid current and new passwords", () => {
  const result = changePasswordSchema.safeParse({
    currentPassword: "CurrentPassword123!",
    newPassword: "NewPassword123!",
  });

  assert.equal(result.success, true);
});

test("Change password rejects missing current password", () => {
  const result = changePasswordSchema.safeParse({
    newPassword: validPassword,
  });

  assert.equal(result.success, false);
});

test("Change password rejects empty current password", () => {
  const result = changePasswordSchema.safeParse({
    currentPassword: "",
    newPassword: validPassword,
  });

  assert.equal(result.success, false);
});

test("Change password rejects unexpected fields", () => {
  const result = changePasswordSchema.safeParse({
    currentPassword: "CurrentPassword123!",
    newPassword: validPassword,
    userId: "123",
  });

  assert.equal(result.success, false);
});

// REFRESH
test("Refresh schema accepts an empty object", () => {
  assert.equal(refreshSchema.safeParse({}).success, true);
});

test("Refresh schema rejects unexpected body fields", () => {
  assert.equal(
    refreshSchema.safeParse({ refreshToken: "client-token" }).success,
    false
  );
});

// VERIFY EMAIL
test("Verify email accepts a valid six-digit OTP", () => {
  const result = verifyEmailSchema.safeParse({
    email: validEmail,
    otp: "012345",
  });

  assert.equal(result.success, true);
});

test("Verify email preserves leading zeros in OTP", () => {
  const result = verifyEmailSchema.safeParse({
    email: validEmail,
    otp: "000001",
  });

  assert.equal(result.success, true);
  assert.equal(result.data.otp, "000001");
});

test("Verify email rejects OTP with fewer than six digits", () => {
  assert.equal(
    verifyEmailSchema.safeParse({
      email: validEmail,
      otp: "12345",
    }).success,
    false
  );
});

test("Verify email rejects OTP with more than six digits", () => {
  assert.equal(
    verifyEmailSchema.safeParse({
      email: validEmail,
      otp: "1234567",
    }).success,
    false
  );
});

test("Verify email rejects alphabetic OTP", () => {
  assert.equal(
    verifyEmailSchema.safeParse({
      email: validEmail,
      otp: "12AB56",
    }).success,
    false
  );
});

test("Verify email rejects unexpected fields", () => {
  assert.equal(
    verifyEmailSchema.safeParse({
      email: validEmail,
      otp: "123456",
      userId: "123",
    }).success,
    false
  );
});

// RESEND OTP
test("Resend OTP accepts a valid email", () => {
  assert.equal(
    resendOtpSchema.safeParse({ email: validEmail }).success,
    true
  );
});

test("Resend OTP rejects invalid email", () => {
  assert.equal(
    resendOtpSchema.safeParse({ email: "invalid-email" }).success,
    false
  );
});

test("Resend OTP rejects unexpected fields", () => {
  assert.equal(
    resendOtpSchema.safeParse({
      email: validEmail,
      otp: "123456",
    }).success,
    false
  );
});
