const jwt = require("jsonwebtoken");
const { prisma } = require("../config/database");
const env = require("../config/env");

async function requireAuth(req, res, next) {
  try {
    const authorization = req.headers.authorization;

    if (!authorization || !authorization.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Please log in to continue.",
        },
      });
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_ACCESS_TOKEN",
          message: "Your access token is invalid or expired.",
        },
      });
    }

    const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
      issuer: "equilx-ielts-api",
      audience: "equilx-ielts-client",
      algorithms: ["HS256"],
    });

    if (typeof payload.sub !== "string") {
      throw new Error("Invalid token subject");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
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
    });

    if (!user || !user.isActive || !user.emailVerifiedAt) {
      return res.status(401).json({
        success: false,
        error: {
          code: "ACCOUNT_UNAVAILABLE",
          message: "Your account is unavailable. Please log in again.",
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_ACCESS_TOKEN",
          message: "Your access token is invalid or expired.",
        },
      });
    }

    next(error);
  }
}

module.exports = { requireAuth };
