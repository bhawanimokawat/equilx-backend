
const { prisma } = require("../../../config/database");

function createServiceError(message, statusCode = 400, code = "CHAT_ERROR") {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

const ACTIVE_STATUS = "ACTIVE";

async function requireInstituteMembership({
  tx,
  userId,
  instituteId,
  allowedRoles,
}) {
  const membership = await tx.instituteMembership.findFirst({
    where: {
      userId,
      instituteId,
      status: ACTIVE_STATUS,
      role: { in: allowedRoles },
      user: {
        isActive: true,
        emailVerifiedAt: { not: null },
      },
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!membership) {
    throw createServiceError(
      "You do not have permission to access this institute.",
      403,
      "INSTITUTE_ACCESS_DENIED"
    );
  }

  return membership;
}

async function requireConversationAccess({
  tx,
  userId,
  instituteId,
  conversationId,
  allowedRoles = ["INSTITUTE_ADMIN", "TRAINER", "INSTITUTE_STUDENT"],
}) {
  await requireInstituteMembership({
    tx,
    userId,
    instituteId,
    allowedRoles,
  });

  const participant = await tx.conversationParticipant.findFirst({
    where: {
      conversationId,
      userId,
      leftAt: null,
      conversation: {
        instituteId,
        status: { not: "CLOSED" },
      },
    },
    include: {
      conversation: true,
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

async function validateConversationUser({
  tx,
  userId,
  instituteId,
}) {
  const membership = await tx.instituteMembership.findFirst({
    where: {
      userId,
      instituteId,
      status: ACTIVE_STATUS,
      role: { in: ["INSTITUTE_ADMIN", "TRAINER", "INSTITUTE_STUDENT"] },
      user: {
        isActive: true,
        emailVerifiedAt: { not: null },
      },
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!membership) {
    throw createServiceError(
      "One or more participants are not active members of this institute.",
      400,
      "INVALID_CONVERSATION_PARTICIPANT"
    );
  }

  return membership;
}

async function createDirectConversation({
  userId,
  instituteId,
  recipientUserId,
}) {
  if (userId === recipientUserId) {
    throw createServiceError(
      "You cannot create a conversation with yourself."
    );
  }

  return prisma.$transaction(async (tx) => {
    const senderMembership = await requireInstituteMembership({
      tx,
      userId,
      instituteId,
      allowedRoles: ["INSTITUTE_ADMIN", "TRAINER"],
    });

    const recipientMembership = await validateConversationUser({
      tx,
      userId: recipientUserId,
      instituteId,
    });

    // Trainers can directly message only their assigned students.
    if (
      senderMembership.role === "TRAINER" &&
      recipientMembership.role === "INSTITUTE_STUDENT"
    ) {
      const trainerAssignment = await tx.trainerStudent.findFirst({
        where: {
          instituteId,
          trainerUserId: userId,
          studentUserId: recipientUserId,
          status: "ACTIVE",
          revokedAt: null,
        },
      });

    if (!trainerAssignment) {
        throw createServiceError(
          "You can only message students assigned to you.",
          403,
          "STUDENT_NOT_ASSIGNED"
        );
      }
    }

    // Check whether an existing direct conversation is available.
    const existing = await tx.conversation.findFirst({
      where: {
        instituteId,
        type: "DIRECT",
        status: "ACTIVE",
        batchId: null,
        AND: [
          {
            participants: {
              some: {
                userId,
                leftAt: null,
              },
            },
          },
          {
            participants: {
              some: {
                userId: recipientUserId,
                leftAt: null,
              },
            },
          },
        ],
      },
      include: {
        participants: {
          where: { leftAt: null },
          select: { userId: true },
        },
      },
    });

    if (
      existing &&
      existing.participants.length === 2
    ) {
      return existing;
    }

    // Reuse a previous direct conversation if it was closed
    // or a participant had left, but only if it has no other active users.
    const reusable = await tx.conversation.findFirst({
      where: {
        instituteId,
        type: "DIRECT",
        batchId: null,
        status: { not: "CLOSED" },
        AND: [
          {
            participants: {
              some: { userId },
            },
          },
          {
            participants: {
              some: { userId: recipientUserId },
            },
          },
        ],
      },
      include: {
        participants: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (
      reusable &&
      reusable.participants.every(
        (participant) =>
          participant.userId === userId ||
          participant.userId === recipientUserId
      )
    ) {
      await tx.conversation.update({
        where: { id: reusable.id },
        data: { status: "ACTIVE" },
      });

      await tx.conversationParticipant.updateMany({
        where: {
          conversationId: reusable.id,
          userId: { in: [userId, recipientUserId] },
        },
        data: {
          leftAt: null,
        },
      });

      return tx.conversation.findUnique({
        where: { id: reusable.id },
        include: {
          participants: {
            where: { leftAt: null },
          },
        },
      });
    }

    return tx.conversation.create({
      data: {
        instituteId,
        type: "DIRECT",
        createdById: userId,
        participants: {
          create: [
            { userId, role: "MEMBER" },
            { userId: recipientUserId, role: "MEMBER" },
          ],
        },
      },
      include: {
        participants: true,
      },
    });
  });
}

async function createGroupConversation({
  userId,
  instituteId,
  title,
  batchId,
  participantIds,
}) {
  return prisma.$transaction(async (tx) => {
    await requireInstituteMembership({
      tx,
      userId,
      instituteId,
      allowedRoles: ["INSTITUTE_ADMIN", "TRAINER"],
    });

    if (batchId) {
      const batch = await tx.batch.findFirst({
        where: {
          id: batchId,
          instituteId,
        },
        select: {
          id: true,
          trainerId: true,
        },
      });

      if (!batch) {
        throw createServiceError(
          "Batch not found in this institute.",
          404,
          "BATCH_NOT_FOUND"
        );
      }

      const isAdmin = await tx.instituteMembership.findFirst({
        where: {
          userId,
          instituteId,
          role: "INSTITUTE_ADMIN",
          status: ACTIVE_STATUS,
        },
        select: { id: true },
      });

      if (!isAdmin && batch.trainerId !== userId) {
        throw createServiceError(
          "Only the institute admin or assigned trainer can create this batch conversation.",
          403,
          "BATCH_ACCESS_DENIED"
        );
      }
    }

    const uniqueUserIds = [
      ...new Set([userId, ...participantIds]),
    ];

    for (const participantId of uniqueUserIds) {
      await validateConversationUser({
        tx,
        userId: participantId,
        instituteId,
      });
    }

    if (batchId) {
      const batchMembers = await tx.batchMember.findMany({
        where: {
          batchId,
          userId: { in: uniqueUserIds },
        },
        select: { userId: true },
      });

      const batchMemberIds = new Set(
        batchMembers.map((member) => member.userId)
      );

      if (!batchMemberIds.has(userId)) {
        throw createServiceError(
          "You must belong to this batch to create its conversation.",
          403,
          "BATCH_MEMBERSHIP_REQUIRED"
        );
      }

      const invalidParticipants = uniqueUserIds.filter(
        (id) => !batchMemberIds.has(id)
      );

      if (invalidParticipants.length > 0) {
        throw createServiceError(
          "All group participants must belong to the selected batch.",
          400,
          "INVALID_BATCH_PARTICIPANTS"
        );
      }
    }

    return tx.conversation.create({
      data: {
        instituteId,
        batchId: batchId || null,
        type: "INSTITUTE_GROUP",
        title,
        createdById: userId,
        participants: {
          create: uniqueUserIds.map((participantId) => ({
            userId: participantId,
            role: participantId === userId ? "ADMIN" : "MEMBER",
          })),
        },
      },
      include: {
        participants: true,
      },
    });
  });
}

async function listConversations({
  userId,
  instituteId,
  page,
  limit,
  search,
  status,
}) {
  await requireInstituteMembership({
    tx: prisma,
    userId,
    instituteId,
    allowedRoles: [
      "INSTITUTE_ADMIN",
      "TRAINER",
      "INSTITUTE_STUDENT",
    ],
  });

  const where = {
    instituteId,
    participants: {
      some: {
        userId,
        leftAt: null,
      },
    },
    ...(status ? { status } : { status: { not: "CLOSED" } }),
    ...(search
      ? {
        title: {
          contains: search,
          mode: "insensitive",
        },
      }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.conversation.findMany({
      where,
      include: {
        participants: {
          where: { leftAt: null },
          select: {
            userId: true,
            role: true,
            joinedAt: true,
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: { name: true },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            content: true,
            senderId: true,
            createdAt: true,
            status: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.conversation.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getConversationById({
  userId,
  instituteId,
  conversationId,
}) {
  return prisma.$transaction(async (tx) => {
    await requireConversationAccess({
      tx,
      userId,
      instituteId,
      conversationId,
    });

    return tx.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          where: { leftAt: null },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: {
                  select: { name: true },
                },
              },
            },
          },
        },
        batch: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  });
}

async function updateConversation({
  userId,
  instituteId,
  conversationId,
  title,
}) {
  return prisma.$transaction(async (tx) => {
    const participant = await requireConversationAccess({
      tx,
      userId,
      instituteId,
      conversationId,
      allowedRoles: ["INSTITUTE_ADMIN", "TRAINER"],
    });

    if (
      participant.conversation.type !== "INSTITUTE_GROUP" ||
      participant.role !== "ADMIN"
    ) {
      throw createServiceError(
        "Only group administrators can update this conversation.",
        403,
        "GROUP_UPDATE_DENIED"
      );
    }

    return tx.conversation.update({
      where: { id: conversationId },
      data: { title },
    });
  });
}

async function addParticipants({
  userId,
  instituteId,
  conversationId,
  userIds,
}) {
  return prisma.$transaction(async (tx) => {
    const participant = await requireConversationAccess({
      tx,
      userId,
      instituteId,
      conversationId,
      allowedRoles: ["INSTITUTE_ADMIN", "TRAINER"],
    });

    if (
      participant.conversation.type !== "INSTITUTE_GROUP" ||
      participant.role !== "ADMIN"
    ) {
      throw createServiceError(
        "Only group administrators can add participants.",
        403,
        "PARTICIPANT_ADD_DENIED"
      );
    }

    const uniqueIds = [...new Set(userIds)];

    for (const newUserId of uniqueIds) {
      await validateConversationUser({
        tx,
        userId: newUserId,
        instituteId,
      });
    }

    if (participant.conversation.batchId) {
      const batchMembers = await tx.batchMember.findMany({
        where: {
          batchId: participant.conversation.batchId,
          userId: { in: uniqueIds },
        },
        select: { userId: true },
      });

      if (batchMembers.length !== uniqueIds.length) {
        throw createServiceError(
          "All participants must belong to this batch.",
          400,
          "INVALID_BATCH_PARTICIPANTS"
        );
      }
    }

    let added = 0;

    for (const newUserId of uniqueIds) {
      const existing = await tx.conversationParticipant.findUnique({
        where: {
          conversationId_userId: {
            conversationId,
            userId: newUserId,
          },
        },
      });

      if (existing) {
        if (existing.leftAt === null) {
          continue;
        }

        await tx.conversationParticipant.update({
          where: { id: existing.id },
          data: {
            leftAt: null,
            joinedAt: new Date(),
            role: "MEMBER",
          },
        });
      } else {
        await tx.conversationParticipant.create({
          data: {
            conversationId,
            userId: newUserId,
            role: "MEMBER",
          },
        });
      }

      added++;
    }

    return { added };
  });
}

async function removeParticipant({
  userId,
  instituteId,
  conversationId,
  targetUserId,
}) {
  return prisma.$transaction(async (tx) => {
    const actor = await requireConversationAccess({
      tx,
      userId,
      instituteId,
      conversationId,
      allowedRoles: ["INSTITUTE_ADMIN", "TRAINER"],
    });

    if (
      actor.conversation.type !== "INSTITUTE_GROUP" ||
      actor.role !== "ADMIN"
    ) {
      throw createServiceError(
        "Only group administrators can remove participants.",
        403,
        "PARTICIPANT_REMOVE_DENIED"
      );
    }

    if (userId === targetUserId) {
      throw createServiceError(
        "Use the leave conversation operation to remove yourself."
      );
    }

    const target = await tx.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId: targetUserId,
        leftAt: null,
      },
    });

    if (!target) {
      throw createServiceError(
        "Active participant not found.",
        404,
        "PARTICIPANT_NOT_FOUND"
      );
    }

    await tx.conversationParticipant.update({
      where: { id: target.id },
      data: { leftAt: new Date() },
    });

    return { removed: true };
  });
}

async function archiveConversation({
  userId,
  instituteId,
  conversationId,
}) {
  return prisma.$transaction(async (tx) => {
    const participant = await requireConversationAccess({
      tx,
      userId,
      instituteId,
      conversationId,
    });

    if (
      participant.conversation.type === "INSTITUTE_GROUP" &&
      participant.role !== "ADMIN"
    ) {
      throw createServiceError(
        "Only group administrators can archive group conversations.",
        403,
        "CONVERSATION_ARCHIVE_DENIED"
      );
    }

    return tx.conversation.update({
      where: { id: conversationId },
      data: { status: "ARCHIVED" },
    });
  });
}

module.exports = {
  createDirectConversation,
  createGroupConversation,
  listConversations,
  getConversationById,
  updateConversation,
  addParticipants,
  removeParticipant,
  archiveConversation,
};
