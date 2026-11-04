const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { prisma } = require("../../../config/database");
const env = require("../../../config/env");

const REFRESH_COOKIE_NAME = "equilx_refresh";

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.platformRole,
    },
    env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: env.ACCESS_TOKEN_TTL,
      issuer: "equilx-ielts-api",
      audience: "equilx-ielts-client",
    }
  );
}

function createRefreshToken() {
  return crypto.randomBytes(48).toString("base64url");
}

function getRefreshExpiry() {
  return new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );
}

async function createSession(userId) {
  const refreshToken = createRefreshToken();

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: getRefreshExpiry(),
    },
  });

  return { refreshToken };
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth",
  });
}

module.exports = {
  REFRESH_COOKIE_NAME,
  hashToken,
  createAccessToken,
  createRefreshToken,
  getRefreshExpiry,
  createSession,
  setRefreshCookie,
  clearRefreshCookie,
};
