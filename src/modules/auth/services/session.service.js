
const { randomUUID } = require("node:crypto");

const { prisma } = require("../../../config/database");

const {
  hashToken,
  createAccessToken,
  createRefreshToken,
  getRefreshExpiry,
} = require("./token.service");

async function createAuthenticatedSession(user) {
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

  const accessToken = createAccessToken(user);

  const safeUser = {
    id: user.id,
    email: user.email,
    platformRole: user.platformRole,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    profile: user.profile || null,
  };

  return {
    accessToken,
    refreshToken,
    user: safeUser,
  };
}

module.exports = {
  createAuthenticatedSession,
};
