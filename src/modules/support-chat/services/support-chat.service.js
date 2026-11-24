
const { prisma } = require("../../../config/database");

const MAX_MESSAGE_LENGTH = 10000;
const MAX_SUBJECT_LENGTH = 200;
const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

function httpError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function isSuperAdmin(user) {
  return user?.platformRole === "SUPER_ADMIN";
}

function isIndividualStudent(user) {
  return (
    user?.platformRole === "USER" &&
    !user?.memberships?.some(
      (membership) =>
        membership.status === "ACTIVE" &&
        membership.role === "INSTITUTE_STUDENT"
    )
  );
}

function requireSupportStudent(user) {
  if (!user) {
    throw httpError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Please log in to continue."
    );
  }

  if (!isIndividualStudent(user)) {
    throw httpError(
      403,
      "SUPPORT_STUDENT_ACCESS_DENIED",
      "Only individual students can start a support chat."
    );
  }
}

function requireSupportUser(user) {
  if (!user) {
    throw httpError(
      401,
      "AUTHENTICATION_REQUIRED",
      "Please log in to continue."
    );
  }

  if (!isSuperAdmin(user) && !isIndividualStudent(user)) {
    throw httpError(
      403,
      "SUPPORT_CHAT_ACCESS_DENIED",
      "You do not have permission to access support chat."
    );
  }
}

function parsePagination(query = {}) {
  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? DEFAULT_LIMIT);

  if (
    !Number.isSafeInteger(page) ||
    page < 1 ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > MAX_LIMIT
  ) {
    throw httpError(
      400,
      "INVALID_PAGINATION",
      "Invalid page or limit."
    );
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
}

function validateUuid(id) {
  if (
    typeof id !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  ) {
    throw httpError(
      400,
      "INVALID_CONVERSATION_ID",
      "A valid conversation ID is required."
    );
  }

  return id;
}

function validateContent(content) {
  if (typeof content !== "string") {
    throw httpError(
      400,
      "INVALID_MESSAGE",
      "Message content must be text."
    );
  }

  const trimmed = content.trim();

  if (
    !trimmed ||
    trimmed.length > MAX_MESSAGE_LENGTH
  ) {
    throw httpError(
      400,
      "INVALID_MESSAGE",
      `Message must contain 1 to ${MAX_MESSAGE_LENGTH} characters.`
    );
  }

  return trimmed;
}

function validateSubject(subject) {
  if (subject == null || subject === "") {
    return null;
  }

  if (typeof subject !== "string") {
    throw httpError(
      400,
      "INVALID_SUBJECT",
      "Subject must be text."
    );
  }

  const trimmed = subject.trim();

  if (trimmed.length > MAX_SUBJECT_LENGTH) {
    throw httpError(
      400,
      "INVALID_SUBJECT",
      "Subject must not exceed 200 characters."
    );
  }

  return trimmed || null;
}

const conversationInclude = {
  student: {
    select: {
      id: true,
      email: true,
      profile: {
        select: {
          name: true,
          avatarUrl: true,
        },
      },
    },
  },
  messages: {
    where: {
      deletedAt: null,
    },
    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
    take: 1,
    select: {
      id: true,
      content: true,
      senderId: true,
      createdAt: true,
    },
  },
};

const messageInclude = {
  sender: {
    select: {
      id: true,
      email: true,
      platformRole: true,
      profile: {
        select: {
          name: true,
          avatarUrl: true,
        },
      },
    },
  },
};

async function getAuthorizedConversation(
  user,
  conversationId
) {
  requireSupportUser(user);
  validateUuid(conversationId);

  const conversation =
    await prisma.supportConversation.findUnique({
      where: { id: conversationId },
      include: conversationInclude,
    });

  if (!conversation) {
    throw httpError(
      404,
      "SUPPORT_CONVERSATION_NOT_FOUND",
      "Support conversation not found."
    );
  }

  if (
    !isSuperAdmin(user) &&
    conversation.studentId !== user.id
  ) {
    // Avoid disclosing another student's conversation.
    throw httpError(
      404,
      "SUPPORT_CONVERSATION_NOT_FOUND",
      "Support conversation not found."
    );
  }

  return conversation;
}

async function createConversation(user, payload = {}) {
  requireSupportStudent(user);

  const subject = validateSubject(payload.subject);

  return prisma.supportConversation.create({
    data: {
      studentId: user.id,
      subject,
      status: "OPEN",
    },
    include: conversationInclude,
  });
}

async function listConversations(user, query = {}) {
  requireSupportUser(user);

  const { page, limit, skip } =
    parsePagination(query);

  const where = isSuperAdmin(user)
    ? {}
    : { studentId: user.id };

  const [conversations, total] =
    await prisma.$transaction([
      prisma.supportConversation.findMany({
        where,
        include: conversationInclude,
        orderBy: [
          { updatedAt: "desc" },
          { id: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.supportConversation.count({
        where,
      }),
    ]);

  return {
    conversations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getConversation(user, conversationId) {
  return getAuthorizedConversation(
    user,
    conversationId
  );
}

async function listMessages(
  user,
  conversationId,
  query = {}
) {
  await getAuthorizedConversation(
    user,
    conversationId
  );

  const { page, limit, skip } =
    parsePagination(query);

  const where = {
    conversationId,
    deletedAt: null,
  };

  const [messages, total] =
    await prisma.$transaction([
      prisma.supportMessage.findMany({
        where,
        include: messageInclude,
        orderBy: [
          { createdAt: "desc" },
          { id: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.supportMessage.count({
        where,
      }),
    ]);

  return {
    messages: messages.reverse(),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function sendMessage(
  user,
  conversationId,
  payload = {}
) {
  const conversation =
    await getAuthorizedConversation(
      user,
      conversationId
    );

  if (conversation.status !== "OPEN") {
    throw httpError(
      409,
      "SUPPORT_CONVERSATION_CLOSED",
      "This support conversation is closed."
    );
  }

  const content = validateContent(payload.content);

  // Recheck status inside the transaction to prevent
  // a message being added after an admin closes chat.
  return prisma.$transaction(async (tx) => {
    const updated = await tx.supportConversation.updateMany({
      where: {
        id: conversationId,
        status: "OPEN",
      },
      data: {
        updatedAt: new Date(),
      },
    });

    if (updated.count !== 1) {
      throw httpError(
        409,
        "SUPPORT_CONVERSATION_CLOSED",
        "This support conversation is closed."
      );
    }

    return tx.supportMessage.create({
      data: {
        conversationId,
        senderId: user.id,
        content,
      },
      include: messageInclude,
    });
  });
}

async function closeConversation(
  user,
  conversationId
) {
  if (!isSuperAdmin(user)) {
    throw httpError(
      403,
      "SUPER_ADMIN_REQUIRED",
      "Only Super Admin can close support chats."
    );
  }

  await getAuthorizedConversation(
    user,
    conversationId
  );

  return prisma.supportConversation.update({
    where: { id: conversationId },
    data: { status: "CLOSED" },
    include: conversationInclude,
  });
}

module.exports = {
  createConversation,
  listConversations,
  getConversation,
  listMessages,
  sendMessage,
  closeConversation,
};
