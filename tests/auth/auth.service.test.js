
const test = require("node:test");
const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");

const { prisma } = require("../../src/config/database");

const otpModule = require("../../src/modules/auth/services/otp.service");
const twoFactorModule = require("../../src/modules/auth/services/two-factor.service");
const sessionModule = require("../../src/modules/auth/services/session.service");
const tokenModule = require("../../src/modules/auth/services/token.service");

const originalModules = {
  otp: { ...otpModule },
  twoFactor: { ...twoFactorModule },
  session: { ...sessionModule },
  token: { ...tokenModule },
};

const mocks = {
  generateOtp: () => "012345",
  hashOtp: (otp) => `otp:${otp}`,
  sendVerificationOtp: async () => {},
  sendPasswordResetEmail: async () => {},

  requiresLoginTwoFactor: () => false,
  createLoginChallenge: async () => ({
    challengeId: "challenge-123",
    expiresIn: 300,
  }),

  createAuthenticatedSession: async () => ({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    user: { id: "user-123" },
  }),

  hashToken: (token) => `hash:${token}`,
  createAccessToken: () => "access-token",
  createRefreshToken: () => "new-refresh-token",
  getRefreshExpiry: () => new Date(Date.now() + 7 * 86400000),
};

// Replace dependency exports before loading auth.service.
// The service captures these functions when it is required.

Object.assign(otpModule, {
  generateOtp: (...args) => mocks.generateOtp(...args),
  hashOtp: (...args) => mocks.hashOtp(...args),
  sendVerificationOtp: (...args) => mocks.sendVerificationOtp(...args),
  sendPasswordResetEmail: (...args) =>
    mocks.sendPasswordResetEmail(...args),
});

Object.assign(twoFactorModule, {
  requiresLoginTwoFactor: (...args) =>
    mocks.requiresLoginTwoFactor(...args),
  createLoginChallenge: (...args) =>
    mocks.createLoginChallenge(...args),
});

Object.assign(sessionModule, {
  createAuthenticatedSession: (...args) =>
    mocks.createAuthenticatedSession(...args),
});

Object.assign(tokenModule, {
  hashToken: (...args) => mocks.hashToken(...args),
  createAccessToken: (...args) => mocks.createAccessToken(...args),
  createRefreshToken: (...args) => mocks.createRefreshToken(...args),
  getRefreshExpiry: (...args) => mocks.getRefreshExpiry(...args),
});


const servicePath = require.resolve(
  "../../src/modules/auth/services/auth.service"
);

delete require.cache[servicePath];

const authService = require(servicePath);

// Restore the original module exports for other tests.
Object.assign(otpModule, originalModules.otp);
Object.assign(twoFactorModule, originalModules.twoFactor);
Object.assign(sessionModule, originalModules.session);
Object.assign(tokenModule, originalModules.token);

const validPassword = "StrongPassword123!";

const makeUser = (overrides = {}) => ({
  id: "user-123",
  email: "user@example.com",
  passwordHash: null,
  platformRole: "USER",
  emailVerifiedAt: new Date(),
  isActive: true,
  createdAt: new Date(),
  profile: null,
  memberships: [],
  ...overrides,
});

function mockPrisma(methods, callback) {
  const restorations = [];

  for (const [path, replacement] of Object.entries(methods)) {
    const parts = path.split(".");
    const method = parts.pop();

    let target = prisma;

    for (const part of parts) {
      target = target[part];
    }

    restorations.push({
      target,
      method,
      original: target[method],
    });

    target[method] = replacement;
  }

  return Promise.resolve()
    .then(callback)
    .finally(() => {
      for (const item of restorations.reverse()) {
        item.target[item.method] = item.original;
      }
    });
}

function transactionMock(tx) {
  return async (callback) => callback(tx);
}

// LOGIN TESTS

test("Login rejects an unknown email", async () => {
  await mockPrisma(
    {
      "user.findUnique": async () => null,
    },
    async () => {
      await assert.rejects(
        authService.login({
          email: "missing@example.com",
          password: validPassword,
        }),
        (error) => error.statusCode === 401
      );
    }
  );
});

test("Login rejects an account without a password hash", async () => {
  await mockPrisma(
    {
      "user.findUnique": async () => makeUser({
        passwordHash: null,
      }),
    },
    async () => {
      await assert.rejects(
        authService.login({
          email: "user@example.com",
          password: validPassword,
        }),
        (error) => error.statusCode === 401
      );
    }
  );
});

test("Login rejects an incorrect password", async () => {
  const passwordHash = await bcrypt.hash(validPassword, 4);

  await mockPrisma(
    {
      "user.findUnique": async () => makeUser({ passwordHash }),
    },
    async () => {
      await assert.rejects(
        authService.login({
          email: "user@example.com",
          password: "WrongPassword123!",
        }),
        (error) => error.statusCode === 401
      );
    }
  );
});

test("Login rejects an inactive account", async () => {
  const passwordHash = await bcrypt.hash(validPassword, 4);

  await mockPrisma(
    {
      "user.findUnique": async () => makeUser({
        passwordHash,
        isActive: false,
      }),
    },
    async () => {
      await assert.rejects(
        authService.login({
          email: "user@example.com",
          password: validPassword,
        }),
        (error) => error.statusCode === 403
      );
    }
  );
});

test("Login rejects an unverified account", async () => {
  const passwordHash = await bcrypt.hash(validPassword, 4);

  await mockPrisma(
    {
      "user.findUnique": async () => makeUser({
        passwordHash,
        emailVerifiedAt: null,
      }),
    },
    async () => {
      await assert.rejects(
        authService.login({
          email: "user@example.com",
          password: validPassword,
        }),
        (error) => error.statusCode === 403
      );
    }
  );
});

test("Login creates a session for an account without mandatory 2FA", async () => {
  const passwordHash = await bcrypt.hash(validPassword, 4);
  const user = makeUser({ passwordHash });

  let sessionCreated = false;

  mocks.requiresLoginTwoFactor = () => false;
  mocks.createAuthenticatedSession = async (receivedUser) => {
    sessionCreated = true;
    assert.equal(receivedUser.id, user.id);

    return {
      accessToken: "access-token",
      refreshToken: "refresh-token",
      user: { id: user.id },
    };
  };

  await mockPrisma(
    {
      "user.findUnique": async () => user,
    },
    async () => {
      const result = await authService.login({
        email: user.email,
        password: validPassword,
      });

      assert.equal(sessionCreated, true);
      assert.equal(result.accessToken, "access-token");
      assert.equal(result.refreshToken, "refresh-token");
    }
  );
});

test("Login requires 2FA for staff accounts", async () => {
  const passwordHash = await bcrypt.hash(validPassword, 4);
  const user = makeUser({ passwordHash });

  mocks.requiresLoginTwoFactor = () => true;
  mocks.createLoginChallenge = async () => ({
    challengeId: "staff-challenge",
    expiresIn: 300,
  });

  await mockPrisma(
    {
      "user.findUnique": async () => user,
    },
    async () => {
      const result = await authService.login({
        email: user.email,
        password: validPassword,
      });

      assert.equal(result.twoFactorRequired, true);
      assert.equal(result.challengeId, "staff-challenge");
    }
  );
});

// EMAIL VERIFICATION TESTS

test("Email verification rejects an unknown OTP", async () => {
  await mockPrisma(
    {
      "emailVerificationToken.findUnique": async () => null,
    },
    async () => {
      await assert.rejects(
        authService.verifyEmail({
          email: "user@example.com",
          otp: "123456",
        }),
        (error) => error.code === "INVALID_OR_EXPIRED_OTP"
      );
    }
  );
});

test("Email verification rejects an OTP belonging to another email", async () => {
  await mockPrisma(
    {
      "emailVerificationToken.findUnique": async () => ({
        id: "otp-123",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: {
          id: "user-123",
          email: "other@example.com",
          emailVerifiedAt: null,
        },
      }),
    },
    async () => {
      await assert.rejects(
        authService.verifyEmail({
          email: "user@example.com",
          otp: "123456",
        }),
        (error) => error.code === "INVALID_OR_EXPIRED_OTP"
      );
    }
  );
});

test("Email verification rejects an expired OTP", async () => {
  await mockPrisma(
    {
      "emailVerificationToken.findUnique": async () => ({
        id: "otp-123",
        usedAt: null,
        expiresAt: new Date(Date.now() - 60000),
        user: {
          id: "user-123",
          email: "user@example.com",
          emailVerifiedAt: null,
        },
      }),
    },
    async () => {
      await assert.rejects(
        authService.verifyEmail({
          email: "user@example.com",
          otp: "123456",
        }),
        (error) => error.code === "INVALID_OR_EXPIRED_OTP"
      );
    }
  );
});

test("Email verification rejects an already verified account", async () => {
  await mockPrisma(
    {
      "emailVerificationToken.findUnique": async () => ({
        id: "otp-123",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: {
          id: "user-123",
          email: "user@example.com",
          emailVerifiedAt: new Date(),
        },
      }),
    },
    async () => {
      await assert.rejects(
        authService.verifyEmail({
          email: "user@example.com",
          otp: "123456",
        }),
        (error) => error.code === "EMAIL_ALREADY_VERIFIED"
      );
    }
  );
});

test("Email verification rejects an OTP that has already been used", async () => {
  await mockPrisma(
    {
      "emailVerificationToken.findUnique": async () => ({
        id: "otp-123",
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        user: {
          id: "user-123",
          email: "user@example.com",
          emailVerifiedAt: null,
        },
      }),
    },
    async () => {
      await assert.rejects(
        authService.verifyEmail({
          email: "user@example.com",
          otp: "123456",
        }),
        (error) => error.code === "INVALID_OR_EXPIRED_OTP"
      );
    }
  );
});

test("Email verification atomically claims the OTP and verifies the user", async () => {
  const calls = [];

  const tx = {
    emailVerificationToken: {
      updateMany: async (args) => {
        calls.push(args);

        return { count: 1 };
      },
    },
    user: {
      update: async (args) => {
        calls.push(args);
      },
    },
  };

  await mockPrisma(
    {
      "emailVerificationToken.findUnique": async () => ({
        id: "otp-123",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: {
          id: "user-123",
          email: "user@example.com",
          emailVerifiedAt: null,
        },
      }),
      "$transaction": transactionMock(tx),
    },
    async () => {
      const result = await authService.verifyEmail({
        email: "user@example.com",
        otp: "123456",
      });

      assert.deepEqual(result, { emailVerified: true });
      assert.equal(calls.length, 3);
    }
  );
});

test("Email verification rejects an OTP that cannot be claimed", async () => {
  const tx = {
    emailVerificationToken: {
      updateMany: async () => ({ count: 0 }),
    },
    user: {
      update: async () => {
        assert.fail("User must not be updated when OTP claim fails");
      },
    },
  };

  await mockPrisma(
    {
      "emailVerificationToken.findUnique": async () => ({
        id: "otp-123",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: {
          id: "user-123",
          email: "user@example.com",
          emailVerifiedAt: null,
        },
      }),
      "$transaction": transactionMock(tx),
    },
    async () => {
      await assert.rejects(
        authService.verifyEmail({
          email: "user@example.com",
          otp: "123456",
        }),
        (error) => error.code === "INVALID_OR_EXPIRED_OTP"
      );
    }
  );
});

// RESEND OTP TESTS

test("Resend OTP returns without exposing an unknown account", async () => {
  await mockPrisma(
    {
      "user.findUnique": async () => null,
    },
    async () => {
      const result = await authService.resendVerificationOtp(
        "missing@example.com"
      );

      assert.equal(result, undefined);
    }
  );
});

test("Resend OTP does not send email for an already verified account", async () => {
  let emailSent = false;

  mocks.sendVerificationOtp = async () => {
    emailSent = true;
  };

  await mockPrisma(
    {
      "user.findUnique": async () => makeUser({
        emailVerifiedAt: new Date(),
      }),
    },
    async () => {
      await authService.resendVerificationOtp("user@example.com");
      assert.equal(emailSent, false);
    }
  );
});

test("Resend OTP creates a hashed verification token", async () => {
  let createdToken;

  mocks.sendVerificationOtp = async (email, otp) => {
    assert.equal(email, "user@example.com");
    assert.equal(otp, "012345");
  };

  await mockPrisma(
    {
      "user.findUnique": async () => makeUser({
        emailVerifiedAt: null,
      }),
      "emailVerificationToken.create": async (args) => {
        createdToken = args.data;
        return { id: "new-otp-id" };
      },
      "emailVerificationToken.updateMany": async () => ({ count: 1 }),
    },
    async () => {
      await authService.resendVerificationOtp("user@example.com");

      assert.equal(createdToken.tokenHash, "otp:012345");
      assert.ok(createdToken.expiresAt instanceof Date);
      assert.ok(createdToken.expiresAt > new Date());
    }
  );
});

test("Resend OTP invalidates a newly created token when email sending fails", async () => {
  let tokenInvalidated = false;

  mocks.sendVerificationOtp = async () => {
    throw new Error("SMTP unavailable");
  };

  await mockPrisma(
    {
      "user.findUnique": async () => makeUser({
        emailVerifiedAt: null,
      }),
      "emailVerificationToken.create": async () => ({
        id: "new-otp-id",
      }),
      "emailVerificationToken.update": async (args) => {
        tokenInvalidated = args.data.usedAt instanceof Date;
      },
    },
    async () => {
      await assert.rejects(
        authService.resendVerificationOtp("user@example.com"),
        /SMTP unavailable/
      );

      assert.equal(tokenInvalidated, true);
    }
  );
});

// REFRESH SESSION TESTS

test("Refresh session rejects a missing token", async () => {
  await assert.rejects(
    authService.refreshSession(null),
    (error) => error.code === "INVALID_REFRESH_TOKEN"
  );
});

test("Refresh session rejects an unknown token", async () => {
  const tx = {
    refreshToken: {
      findUnique: async () => null,
    },
  };

  await mockPrisma(
    {
      "$transaction": transactionMock(tx),
    },
    async () => {
      await assert.rejects(
        authService.refreshSession("unknown-token"),
        (error) => error.code === "INVALID_REFRESH_TOKEN"
      );
    }
  );
});

test("Refresh session rejects an expired session", async () => {
  const tx = {
    refreshToken: {
      findUnique: async () => ({
        id: "session-123",
        userId: "user-123",
        familyId: "family-123",
        revokedAt: null,
        expiresAt: new Date(Date.now() - 60000),
        user: makeUser(),
      }),
    },
  };

  await mockPrisma(
    {
      "$transaction": transactionMock(tx),
    },
    async () => {
      await assert.rejects(
        authService.refreshSession("old-token"),
        (error) => error.code === "INVALID_REFRESH_TOKEN"
      );
    }
  );
});

test("Refresh session rejects an inactive account", async () => {
  const tx = {
    refreshToken: {
      findUnique: async () => ({
        id: "session-123",
        userId: "user-123",
        familyId: "family-123",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: makeUser({ isActive: false }),
      }),
    },
  };

  await mockPrisma(
    {
      "$transaction": transactionMock(tx),
    },
    async () => {
      await assert.rejects(
        authService.refreshSession("old-token"),
        (error) => error.code === "INVALID_REFRESH_TOKEN"
      );
    }
  );
});

test("Refresh session rejects an already revoked session", async () => {
  const tx = {
    refreshToken: {
      findUnique: async () => ({
        id: "session-123",
        userId: "user-123",
        familyId: "family-123",
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
        user: makeUser(),
      }),
    },
  };

  await mockPrisma(
    {
      "$transaction": transactionMock(tx),
    },
    async () => {
      await assert.rejects(
        authService.refreshSession("old-token"),
        (error) => error.code === "INVALID_REFRESH_TOKEN"
      );
    }
  );
});

test("Refresh session rotates the token and preserves the token family", async () => {
  let createdSession;

  const user = makeUser();

  const tx = {
    refreshToken: {
      findUnique: async () => ({
        id: "old-session",
        userId: user.id,
        familyId: "family-123",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user,
      }),
      updateMany: async () => ({ count: 1 }),
      create: async (args) => {
        createdSession = args.data;
      },
    },
  };

  await mockPrisma(
    {
      "$transaction": transactionMock(tx),
    },
    async () => {
      const result = await authService.refreshSession("old-token");

      assert.equal(result.refreshToken, "new-refresh-token");
      assert.equal(result.accessToken, "access-token");
      assert.equal(createdSession.userId, user.id);
      assert.equal(createdSession.familyId, "family-123");
      assert.equal(createdSession.tokenHash, "hash:new-refresh-token");
    }
  );
});

test("Refresh session rejects when another request already claimed the token", async () => {
  const tx = {
    refreshToken: {
      findUnique: async () => ({
        id: "old-session",
        userId: "user-123",
        familyId: "family-123",
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60000),
        user: makeUser(),
      }),
      updateMany: async () => ({ count: 0 }),
      create: async () => {
        assert.fail("A new token must not be created after a failed claim");
      },
    },
  };

  await mockPrisma(
    {
      "$transaction": transactionMock(tx),
    },
    async () => {
      await assert.rejects(
        authService.refreshSession("old-token"),
        (error) => error.code === "INVALID_REFRESH_TOKEN"
      );
    }
  );
});

// LOGOUT TEST

test("Logout revokes the supplied refresh token", async () => {
  let query;

  await mockPrisma(
    {
      "refreshToken.updateMany": async (args) => {
        query = args;
        return { count: 1 };
      },
    },
    async () => {
      await authService.logout("refresh-token");

      assert.equal(query.where.tokenHash, "hash:refresh-token");
      assert.equal(query.where.revokedAt, null);
      assert.ok(query.data.revokedAt instanceof Date);
    }
  );
});

// PASSWORD RESET REQUEST TESTS

test("Password reset request returns a generic response for an unknown email", async () => {
  await mockPrisma(
    {
      "user.findUnique": async () => null,
    },
    async () => {
      const result = await authService.requestPasswordReset(
        "missing@example.com"
      );

      assert.match(result.message, /If an eligible account exists/);
    }
  );
});

test("Password reset request does not create a token for an unverified account", async () => {
  await mockPrisma(
    {
      "user.findUnique": async () => makeUser({
        emailVerifiedAt: null,
      }),
      "passwordResetToken.create": async () => {
        assert.fail("Reset token must not be created");
      },
    },
    async () => {
      const result = await authService.requestPasswordReset(
        "user@example.com"
      );

      assert.match(result.message, /If an eligible account exists/);
    }
  );
});

test("Password reset request creates a hashed token for an eligible account", async () => {
  let createdToken;
  let sentToken;

  mocks.hashToken = (token) => `hash:${token}`;
  mocks.sendPasswordResetEmail = async (email, token) => {
    sentToken = token;
  };

  await mockPrisma(
    {
      "user.findUnique": async () => makeUser(),
      "passwordResetToken.create": async (args) => {
        createdToken = args.data;
        return { id: "reset-123" };
      },
      "passwordResetToken.updateMany": async () => ({ count: 1 }),
    },
    async () => {
      await authService.requestPasswordReset("user@example.com");

      assert.ok(sentToken);
      assert.equal(createdToken.tokenHash, `hash:${sentToken}`);
      assert.equal(createdToken.userId, "user-123");
      assert.ok(createdToken.expiresAt instanceof Date);
    }
  );
});

// PASSWORD RESET TESTS

test("Password reset rejects an unknown token", async () => {
  await mockPrisma(
    {
      "passwordResetToken.findUnique": async () => null,
    },
    async () => {
      await assert.rejects(
        authService.resetPassword({
          token: "unknown-token",
          newPassword: "NewStrongPassword123!",
        }),
        (error) => error.code === "INVALID_RESET_TOKEN"
      );
    }
  );
});

test("Password reset rejects an expired token", async () => {
  await mockPrisma(
    {
      "passwordResetToken.findUnique": async () => ({
        id: "reset-123",
        userId: "user-123",
        usedAt: null,
        expiresAt: new Date(Date.now() - 60000),
      }),
    },
    async () => {
      await assert.rejects(
        authService.resetPassword({
          token: "expired-token",
          newPassword: "NewStrongPassword123!",
        }),
        (error) => error.code === "INVALID_RESET_TOKEN"
      );
    }
  );
});

test("Password reset rejects a previously used token", async () => {
  await mockPrisma(
    {
      "passwordResetToken.findUnique": async () => ({
        id: "reset-123",
        userId: "user-123",
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60000),
      }),
    },
    async () => {
      await assert.rejects(
        authService.resetPassword({
          token: "used-token",
          newPassword: "NewStrongPassword123!",
        }),
        (error) => error.code === "INVALID_RESET_TOKEN"
      );
    }
  );
});

test("Password reset updates the password and revokes existing sessions", async () => {
  let updatedPasswordHash;
  let revokedSessions = false;

  const tx = {
    passwordResetToken: {
      updateMany: async () => ({ count: 1 }),
    },
    user: {
      update: async (args) => {
        updatedPasswordHash = args.data.passwordHash;
      },
    },
    refreshToken: {
      updateMany: async () => {
        revokedSessions = true;
        return { count: 2 };
      },
    },
  };

  await mockPrisma(
    {
      "passwordResetToken.findUnique": async () => ({
        id: "reset-123",
        userId: "user-123",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      }),
      "$transaction": transactionMock(tx),
    },
    async () => {
      await authService.resetPassword({
        token: "valid-reset-token",
        newPassword: "NewStrongPassword123!",
      });

      assert.ok(updatedPasswordHash);
      assert.notEqual(updatedPasswordHash, "NewStrongPassword123!");

      assert.equal(
        await bcrypt.compare(
          "NewStrongPassword123!",
          updatedPasswordHash
        ),
        true
      );

      assert.equal(revokedSessions, true);
    }
  );
});

test("Password reset rejects a token that cannot be claimed", async () => {
  const tx = {
    passwordResetToken: {
      updateMany: async () => ({ count: 0 }),
    },
    user: {
      update: async () => {
        assert.fail("Password must not be updated");
      },
    },
    refreshToken: {
      updateMany: async () => {
        assert.fail("Sessions must not be revoked");
      },
    },
  };

  await mockPrisma(
    {
      "passwordResetToken.findUnique": async () => ({
        id: "reset-123",
        userId: "user-123",
        usedAt: null,
        expiresAt: new Date(Date.now() + 60000),
      }),
      "$transaction": transactionMock(tx),
    },
    async () => {
      await assert.rejects(
        authService.resetPassword({
          token: "valid-reset-token",
          newPassword: "NewStrongPassword123!",
        }),
        (error) => error.code === "INVALID_RESET_TOKEN"
      );
    }
  );
});

// CHANGE PASSWORD TESTS

test("Change password rejects an unknown account", async () => {
  await mockPrisma(
    {
      "user.findUnique": async () => null,
    },
    async () => {
      await assert.rejects(
        authService.changePassword({
          userId: "missing-user",
          currentPassword: validPassword,
          newPassword: "NewStrongPassword123!",
        }),
        (error) => error.code === "PASSWORD_CHANGE_FAILED"
      );
    }
  );
});

test("Change password rejects an incorrect current password", async () => {
  const passwordHash = await bcrypt.hash(validPassword, 4);

  await mockPrisma(
    {
      "user.findUnique": async () => makeUser({ passwordHash }),
    },
    async () => {
      await assert.rejects(
        authService.changePassword({
          userId: "user-123",
          currentPassword: "WrongPassword123!",
          newPassword: "NewStrongPassword123!",
        }),
        (error) => error.code === "CURRENT_PASSWORD_INCORRECT"
      );
    }
  );
});

test("Change password rejects reusing the current password", async () => {
  const passwordHash = await bcrypt.hash(validPassword, 4);

  await mockPrisma(
    {
      "user.findUnique": async () => makeUser({ passwordHash }),
    },
    async () => {
      await assert.rejects(
        authService.changePassword({
          userId: "user-123",
          currentPassword: validPassword,
          newPassword: validPassword,
        }),
        (error) => error.code === "PASSWORD_UNCHANGED"
      );
    }
  );
});

test("Change password updates the password and revokes sessions", async () => {
  const passwordHash = await bcrypt.hash(validPassword, 4);

  let updatedPasswordHash;
  let sessionsRevoked = false;

  const tx = {
    user: {
      update: async (args) => {
        updatedPasswordHash = args.data.passwordHash;
      },
    },
    refreshToken: {
      updateMany: async () => {
        sessionsRevoked = true;
        return { count: 1 };
      },
    },
  };

  await mockPrisma(
    {
      "user.findUnique": async () => makeUser({ passwordHash }),
      "$transaction": transactionMock(tx),
    },
    async () => {
      await authService.changePassword({
        userId: "user-123",
        currentPassword: validPassword,
        newPassword: "NewStrongPassword123!",
      });

      assert.ok(updatedPasswordHash);
      assert.equal(
        await bcrypt.compare(
          "NewStrongPassword123!",
          updatedPasswordHash
        ),
        true
      );

      assert.equal(sessionsRevoked, true);
    }
  );
});
