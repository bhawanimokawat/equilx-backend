const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const { randomUUID } = require("node:crypto");

const { prisma } = require("../../../config/database");
const { OTP_TTL_MS, generateOtp, hashOtp, sendVerificationOtp, sendPasswordResetEmail, } = require("./otp.service");

const { hashToken, createAccessToken, createRefreshToken, getRefreshExpiry, } = require("./token.service");

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

const publicUserSelect = {
  id: true,
  email: true,
  platformRole: true,
  emailVerifiedAt: true,
  createdAt: true,
  profile: {
    select: {
      name: true,
      phone: true,
      avatarUrl: true,
    },
  },
};

async function verifyEmail({ email, otp }) {
  const tokenHash = hashOtp(otp);

  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: { user: { select: { id: true, email: true, emailVerifiedAt: true } } },
  });

  if (
    !record ||
    record.user.email !== email ||
    record.usedAt ||
    record.expiresAt <= new Date()
  ) {
    throw createError(
      "The verification code is invalid or expired.",
      400,
      "INVALID_OR_EXPIRED_OTP"
    );
  }

  if (record.user.emailVerifiedAt) {
    throw createError("Email is already verified.", 409, "EMAIL_ALREADY_VERIFIED");
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.emailVerificationToken.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (claimed.count !== 1) {
      throw createError(
        "The verification code is invalid or expired.",
        400,
        "INVALID_OR_EXPIRED_OTP"
      );
    }

    await tx.user.update({
      where: { id: record.user.id },
      data: { emailVerifiedAt: now },
    });

    await tx.emailVerificationToken.updateMany({
      where: {
        userId: record.user.id,
        id: { not: record.id },
        usedAt: null,
      },
      data: { usedAt: now },
    });
  });

  return { emailVerified: true };
}

async function resendVerificationOtp(email) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, emailVerifiedAt: true, isActive: true },
  });

  // Keep the response generic to avoid exposing account status.
  if (!user || user.emailVerifiedAt || !user.isActive) {
    return;
  }

  const otp = generateOtp();
  const tokenHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const token = await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
    select: { id: true },
  });

  try {
    await sendVerificationOtp(user.email, otp);
  } catch (error) {
    await prisma.emailVerificationToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }).catch(() => { });
    throw error;
  }

  await prisma.emailVerificationToken.updateMany({
    where: {
      userId: user.id,
      id: { not: token.id },
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });
}

async function login({ email, password }) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      platformRole: true,
      emailVerifiedAt: true,
      isActive: true,
      createdAt: true,
      profile: {
        select: { name: true, phone: true, avatarUrl: true },
      },
    },
  });

  // Use the same error for unknown emails and incorrect passwords.
  const passwordMatches =
    user?.passwordHash
      ? await bcrypt.compare(password, user.passwordHash)
      : false;

  if (!user || !passwordMatches) {
    throw createError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
  }

  if (!user.isActive) {
    throw createError("This account is unavailable.", 403, "ACCOUNT_INACTIVE");
  }

  if (!user.emailVerifiedAt) {
    throw createError("Please verify your email before logging in.", 403, "EMAIL_NOT_VERIFIED");
  }

  const refreshToken = createRefreshToken();
  const familyId = randomUUID();

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshExpiry(),
    },
  });

  const { passwordHash, isActive, ...safeUser } = user;

  return {
    accessToken: createAccessToken(user),
    refreshToken,
    user: safeUser,
  };
}

async function refreshSession(rawRefreshToken) {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
    throw createError("Please log in again.", 401, "INVALID_REFRESH_TOKEN");
  }

  const oldHash = hashToken(rawRefreshToken);
  const newRefreshToken = createRefreshToken();
  const now = new Date();

  const user = await prisma.$transaction(async (tx) => {
    const session = await tx.refreshToken.findUnique({
      where: { tokenHash: oldHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            platformRole: true,
            emailVerifiedAt: true,
            isActive: true,
            createdAt: true,
            profile: {
              select: { name: true, phone: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      !session.user.isActive ||
      !session.user.emailVerifiedAt
    ) {
      throw createError("Please log in again.", 401, "INVALID_REFRESH_TOKEN");
    }

    const revoked = await tx.refreshToken.updateMany({
      where: {
        id: session.id,
        revokedAt: null,
        expiresAt: { gt: now },
      },
      data: { revokedAt: now },
    });

    if (revoked.count !== 1) {
      throw createError("Please log in again.", 401, "INVALID_REFRESH_TOKEN");
    }

    await tx.refreshToken.create({
      data: {
        userId: session.userId,
        familyId: session.familyId,
        tokenHash: hashToken(newRefreshToken),
        expiresAt: getRefreshExpiry(),
      },
    });

    return session.user;
  });

  return {
    accessToken: createAccessToken(user),
    refreshToken: newRefreshToken,
    user,
  };
}

async function logout(rawRefreshToken) {
  if (rawRefreshToken && typeof rawRefreshToken === "string") {
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash: hashToken(rawRefreshToken),
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }
}

async function requestPasswordReset(email) {
  const genericResponse = {
    message: "If an eligible account exists, password-reset instructions will be sent.",
  };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, isActive: true, emailVerifiedAt: true },
  });

  if (!user || !user.isActive || !user.emailVerifiedAt) {
    return genericResponse;
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  const resetToken = await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
    select: { id: true },
  });

  try {
    await sendPasswordResetEmail(user.email, rawToken);
  } catch (error) {
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }).catch(() => { });
    throw error;
  }

  await prisma.passwordResetToken.updateMany({
    where: {
      userId: user.id,
      id: { not: resetToken.id },
      usedAt: null,
    },
    data: { usedAt: new Date() },
  });

  return genericResponse;
}

async function resetPassword({ token, newPassword }) {
  const tokenHash = hashToken(token);
  const now = new Date();

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      userId: true,
      expiresAt: true,
      usedAt: true,
    },
  });

  if (!record || record.usedAt || record.expiresAt <= now) {
    throw createError("The reset link is invalid or expired.", 400, "INVALID_RESET_TOKEN");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: {
        id: record.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });

    if (claimed.count !== 1) {
      throw createError("The reset link is invalid or expired.", 400, "INVALID_RESET_TOKEN");
    }

    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash },
    });

    await tx.refreshToken.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: now },
    });

    await tx.passwordResetToken.updateMany({
      where: {
        userId: record.userId,
        id: { not: record.id },
        usedAt: null,
      },
      data: { usedAt: now },
    });
  });
}

async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, passwordHash: true, isActive: true },
  });

  if (!user || !user.isActive || !user.passwordHash) {
    throw createError("Unable to change this account's password.", 400, "PASSWORD_CHANGE_FAILED");
  }

  const matches = await bcrypt.compare(currentPassword, user.passwordHash);

  if (!matches) {
    throw createError("Current password is incorrect.", 400, "CURRENT_PASSWORD_INCORRECT");
  }

  if (currentPassword === newPassword) {
    throw createError("Choose a password different from your current password.", 400, "PASSWORD_UNCHANGED");
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await tx.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: now },
    });
  });
}

module.exports = {
  verifyEmail,
  resendVerificationOtp,
  login,
  refreshSession,
  logout,
  requestPasswordReset,
  resetPassword,
  changePassword,
  publicUserSelect,
  createError,
};
