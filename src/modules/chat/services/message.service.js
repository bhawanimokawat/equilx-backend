const { prisma } = require("../../../config/database");


function createServiceError(message, statusCode = 400, code = "CHAT_ERROR") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function requireMessageAccess({
  tx,
  userId,
  instituteId,
  conversationId,
}) {
  const membership = await tx.instituteMembership.findFirst({
    where: {
      userId,
      instituteId,
      status: "ACTIVE",
      role: {
        in: ["INSTITUTE_ADMIN", "TRAINER", "INSTITUTE_STUDENT"],
      },
      user: {
        isActive: true,
        emailVerifiedAt: { not: null },
      },
    },
    select: { id: true },
  });

  if (!membership) {
    throw createServiceError(
      "Institute access denied.",
      403,
      "INSTITUTE_ACCESS_DENIED"
    );
  }

  const participant = await tx.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
      leftAt: null,
      conversation: {
        instituteId,
        status: "ACTIVE",
      },
    },
    select: {
      id: true,
      conversationId: true,
    },
  });

  if (!participant) {
    throw createServiceError(
      "Conversation not found or access denied.",
      404,
      "CONVERSATION_NOT_FOUND"
    );
  }

  return participant;
}

// 1. List conversation messages using cursor pagination
async function listMessages({
  userId,
  instituteId,
  conversationId,
  limit,
  beforeId,
}) {
  return prisma.$transaction(async (tx) => {
    await requireMessageAccess({
      tx,
      userId,
      instituteId,
      conversationId,
    });

    const where = { conversationId };

    if (beforeId) {
      const cursorMessage = await tx.message.findFirst({
        where: {
          id: beforeId,
          conversationId,
        },
        select: {
          id: true,
          createdAt: true,
        },
      });

      if (!cursorMessage) {
        throw createServiceError(
          "Message cursor not found in this conversation.",
          400,
          "INVALID_MESSAGE_CURSOR"
        );
      }

      where.OR = [
        {
          createdAt: {
            lt: cursorMessage.createdAt,
          },
        },
        {
          createdAt: cursorMessage.createdAt,
          id: { lt: cursorMessage.id },
        },
      ];
    }

    const messages = await tx.message.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: limit + 1,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { name: true },
            },
          },
        },
        attachments: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
        },
      },
    });

    const hasMore = messages.length > limit;
    const items = messages.slice(0, limit).reverse();

    return {
      items,
      pagination: {
        limit,
        hasMore,
        nextCursor: hasMore ? items[0]?.id || null : null,
      },
    };
  });
}

// 2. Edit own message
async function editMessage({
  userId,
  instituteId,
  conversationId,
  messageId,
  content,
}) {
  return prisma.$transaction(async (tx) => {
    await requireMessageAccess({
      tx,
      userId,
      instituteId,
      conversationId,
    });

    const message = await tx.message.findFirst({
      where: {
        id: messageId,
        conversationId,
      },
    });

    if (!message) {
      throw createServiceError(
        "Message not found.",
        404,
        "MESSAGE_NOT_FOUND"
      );
    }

    if (message.senderId !== userId) {
      throw createServiceError(
        "You can only edit your own messages.",
        403,
        "MESSAGE_EDIT_DENIED"
      );
    }

    if (message.status === "DELETED" || message.deletedAt) {
      throw createServiceError(
        "Deleted messages cannot be edited.",
        400,
        "MESSAGE_ALREADY_DELETED"
      );
    }

    return tx.message.update({
      where: { id: messageId },
      data: {
        content,
        status: "EDITED",
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: {
              select: { name: true },
            },
          },
        },
        attachments: true,
      },
    });
  });
}

// 3. Soft-delete own message
async function deleteMessage({
  userId,
  instituteId,
  conversationId,
  messageId,
}) {
  return prisma.$transaction(async (tx) => {
    await requireMessageAccess({
      tx,
      userId,
      instituteId,
      conversationId,
    });

    const message = await tx.message.findFirst({
      where: {
        id: messageId,
        conversationId,
      },
    });

    if (!message) {
      throw createServiceError(
        "Message not found.",
        404,
        "MESSAGE_NOT_FOUND"
      );
    }

    if (message.senderId !== userId) {
      throw createServiceError(
        "You can only delete your own messages.",
        403,
        "MESSAGE_DELETE_DENIED"
      );
    }

    if (message.status === "DELETED" || message.deletedAt) {
      throw createServiceError(
        "Message has already been deleted.",
        400,
        "MESSAGE_ALREADY_DELETED"
      );
    }

    return tx.message.update({
      where: { id: messageId },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
        content: "",
      },
      select: {
        id: true,
        conversationId: true,
        senderId: true,
        status: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });
}

// 4. Mark conversation messages as read
async function markConversationRead({
  userId,
  instituteId,
  conversationId,
  lastMessageId,
}) {
  return prisma.$transaction(async (tx) => {
    const participant = await requireMessageAccess({
      tx,
      userId,
      instituteId,
      conversationId,
    });

    let readAt = new Date();

    if (lastMessageId) {
      const message = await tx.message.findFirst({
        where: {
          id: lastMessageId,
          conversationId,
        },
        select: {
          createdAt: true,
        },
      });

      if (!message) {
        throw createServiceError(
          "Message not found in this conversation.",
          404,
          "MESSAGE_NOT_FOUND"
        );
      }

      readAt = message.createdAt;
    }

    const updated = await tx.conversationParticipant.update({
      where: { id: participant.id },
      data: {
        lastReadAt: readAt,
      },
      select: {
        conversationId: true,
        userId: true,
        lastReadAt: true,
      },
    });

    return updated;
  });
}
// 5. Send a new message
async function sendMessage({
  userId,
  instituteId,
  conversationId,
  content,
  clientMessageId,
}) {
  return prisma.$transaction(async (tx) => {
    await requireMessageAccess({
      tx,
      userId,
      instituteId,
      conversationId,
    });

    const existingMessage = await tx.message.findFirst({
      where: {
        senderId: userId,
        clientMessageId,
      },
    });

    if (existingMessage) {
      if (existingMessage.conversationId !== conversationId) {
        throw createServiceError(
          "This client message ID has already been used.",
          409,
          "DUPLICATE_CLIENT_MESSAGE_ID"
        );
      }

      return {
        message: existingMessage,
        isNew: false,
      };
    }

    const message = await tx.message.create({
      data: {
        conversationId,
        senderId: userId,
        content,
        clientMessageId,
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                name: true,
              },
            },
          },
        },
        attachments: true,
      },
    });

    return {
      message,
      isNew: true,
    };
  });
}


module.exports = {
  listMessages,
  editMessage,
  deleteMessage,
  markConversationRead,
  sendMessage,
};
