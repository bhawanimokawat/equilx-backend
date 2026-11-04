const jwt = require("jsonwebtoken");
const { prisma } = require("../../../config/database");
const env = require("../../../config/env");

async function authenticateChatSocket(socket, next) {
  try {
    const authToken = socket.handshake.auth?.token;

    const authorization = socket.handshake.headers?.authorization;

    const token =
      typeof authToken === "string"
        ? authToken.trim()
        : typeof authorization === "string" &&
            authorization.startsWith("Bearer ")
          ? authorization.slice(7).trim()
          : null;

    if (!token) {
      return next(new Error("Authentication required."));
    }

    const payload = jwt.verify(token, env.ACCESS_TOKEN_SECRET, {
      issuer: "equilx-ielts-api",
      audience: "equilx-ielts-client",
      algorithms: ["HS256"],
    });

    if (typeof payload.sub !== "string") {
      return next(new Error("Invalid access token."));
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        platformRole: true,
        emailVerifiedAt: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive || !user.emailVerifiedAt) {
      return next(new Error("Account unavailable."));
    }

    // Never accept the user ID from the client.
    socket.data.user = {
      id: user.id,
      email: user.email,
      platformRole: user.platformRole,
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError" ||
      error.name === "NotBeforeError"
    ) {
      return next(new Error("Invalid or expired access token."));
    }

    next(new Error("Socket authentication failed."));
  }
}



async function authorizeConversationRoom({
  userId,
  instituteId,
  conversationId,
}) {
  // Verify active institute membership.
  const membership = await prisma.instituteMembership.findFirst({
    where: {
      instituteId,
      userId,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (!membership) {
    throw new Error("You do not have access to this institute.");
  }

  // Verify conversation and active participation.
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      instituteId,
      status: "ACTIVE",
      participants: {
        some: {
          userId,
          leftAt: null,
        },
      },
    },
    select: {
      id: true,
      instituteId: true,
      type: true,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found or access denied.");
  }

  return conversation;
}


module.exports = { authenticateChatSocket,authorizeConversationRoom };
