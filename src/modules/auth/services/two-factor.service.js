
const crypto = require("node:crypto");
const { prisma } = require("../../../config/database");
const { generateOtp, hashOtp, sendLoginOtp } = require("./otp.service");

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function createError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function requiresLoginTwoFactor(user) {
  if (user.platformRole === "SUPER_ADMIN") {
    return true;
  }

  return (
    user.memberships?.some(
      (membership) =>
        membership.status === "ACTIVE" &&
        ["TRAINER", "INSTITUTE_ADMIN"].includes(membership.role)
    ) || false
  );
}

async function createLoginChallenge(user) {
  const otp = generateOtp();
  const codeHash = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  const challenge = await prisma.$transaction(async (tx) => {
    await tx.twoFactorChallenge.updateMany({
      where: {
        userId: user.id,
        purpose: "LOGIN",
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    return tx.twoFactorChallenge.create({
      data: {
        userId: user.id,
        purpose: "LOGIN",
        codeHash,
        expiresAt,
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });
  });

  try {
    await sendLoginOtp(user.email, otp);
  } catch (error) {
    await prisma.twoFactorChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    throw createError(
      "Unable to send login verification code.",
      503,
      "TWO_FACTOR_EMAIL_FAILED"
    );
  }

  return {
    required: true,
    challengeId: challenge.id,
    expiresIn: Math.floor(OTP_TTL_MS / 1000),
    message: "A login verification code has been sent to your email.",
  };
}

async function verifyLoginChallenge({ challengeId, otp }) {
  if (!challengeId || !otp) {
    throw createError(
      "Challenge ID and verification code are required.",
      400,
      "TWO_FACTOR_INPUT_REQUIRED"
    );
  }

  const challenge = await prisma.twoFactorChallenge.findUnique({
    where: {
      id: challengeId,
    },
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
            select: {
              name: true,
              phone: true,
              avatarUrl: true,
            },
          },
          memberships: {
            where: {
              status: "ACTIVE",
            },
            select: {
              role: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (
    !challenge ||
    challenge.purpose !== "LOGIN" ||
    challenge.consumedAt
  ) {
    throw createError(
      "Invalid or expired login challenge.",
      400,
      "INVALID_TWO_FACTOR_CHALLENGE"
    );
  }

  if (challenge.expiresAt <= new Date()) {
    await prisma.twoFactorChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
      },
      data: {
        consumedAt: new Date(),
      },
    });

    throw createError(
      "Login verification code has expired.",
      400,
      "TWO_FACTOR_EXPIRED"
    );
  }

  if (challenge.attempts >= MAX_ATTEMPTS) {
    throw createError(
      "Too many incorrect verification attempts.",
      429,
      "TWO_FACTOR_MAX_ATTEMPTS"
    );
  }

  const submittedHash = hashOtp(otp);
  const storedHash = Buffer.from(challenge.codeHash, "hex");
  const submittedBuffer = Buffer.from(submittedHash, "hex");

  const validLength = storedHash.length === submittedBuffer.length;

  const isValid =
    validLength &&
    crypto.timingSafeEqual(storedHash, submittedBuffer);

  if (!isValid) {
    const attemptResult = await prisma.twoFactorChallenge.updateMany({
      where: {
        id: challenge.id,
        consumedAt: null,
        attempts: {
          lt: MAX_ATTEMPTS,
        },
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });

    if (attemptResult.count !== 1) {
      throw createError(
        "Too many incorrect verification attempts.",
        429,
        "TWO_FACTOR_MAX_ATTEMPTS"
      );
    }

    throw createError(
      "Invalid verification code.",
      400,
      "INVALID_TWO_FACTOR_OTP"
    );
  }

  if (!challenge.user.isActive) {
    throw createError(
      "This account is inactive.",
      403,
      "ACCOUNT_INACTIVE"
    );
  }

  const consumed = await prisma.twoFactorChallenge.updateMany({
    where: {
      id: challenge.id,
      consumedAt: null,
      expiresAt: {
        gt: new Date(),
      },
      attempts: {
        lt: MAX_ATTEMPTS,
      },
    },
    data: {
      consumedAt: new Date(),
    },
  });

  if (consumed.count !== 1) {
    throw createError(
      "Invalid or expired login challenge.",
      400,
      "INVALID_TWO_FACTOR_CHALLENGE"
    );
  }

  return {
    verified: true,
    user: challenge.user,
  };
}

module.exports = {
  requiresLoginTwoFactor,
  createLoginChallenge,
  verifyLoginChallenge,
};
