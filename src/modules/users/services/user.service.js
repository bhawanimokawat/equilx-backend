const { prisma } = require("../../../config/database");

async function getMyProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
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
    },
  });
}

async function updateMyProfile(userId, profileData) {
  return prisma.$transaction(async (tx) => {
    await tx.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        ...profileData,
      },
      update: profileData,
    });

    return tx.user.findUnique({
      where: { id: userId },
      select: {
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
      },
    });
  });
}

async function getMySecurity(userId) {
  const [user, sessions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        isActive: true,
        emailVerifiedAt: true,
        createdAt: true,
      },
    }),

    prisma.refreshToken.groupBy({
      by: ["revokedAt"],
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      _count: { _all: true },
    }),
  ]);

  if (!user) return null;

  const activeSessions = sessions
    .filter((session) => session.revokedAt === null)
    .reduce((total, session) => total + session._count._all, 0);

  return {
    accountActive: user.isActive,
    emailVerified: Boolean(user.emailVerifiedAt),
    createdAt: user.createdAt,
    activeRefreshSessions: activeSessions,
  };
}


async function listUsers({ page, limit, search, status }) {
  const where = {};

  if (status === "ACTIVE") {
    where.isActive = true;
  } else if (status === "INACTIVE") {
    where.isActive = false;
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      {
        profile: {
          is: {
            name: { contains: search, mode: "insensitive" },
          },
        },
      },
    ];
  }

  const skip = (page - 1) * limit;

  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
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
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users: users.map((user) => ({
      ...user,
      emailVerified: Boolean(user.emailVerifiedAt),
      emailVerifiedAt: undefined,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


async function updateUserStatus({ targetUserId, actorUserId, isActive }) {
  if (targetUserId === actorUserId && !isActive) {
    const error = new Error("You cannot deactivate your own account.");
    error.statusCode = 400;
    error.code = "SELF_DEACTIVATION_NOT_ALLOWED";
    throw error;
  }

  return prisma.$transaction(async (tx) => {
    const targetUser = await tx.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isActive: true },
    });

    if (!targetUser) return null;

    const user = await tx.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: {
        id: true,
        email: true,
        platformRole: true,
        isActive: true,
        emailVerifiedAt: true,
        updatedAt: true,
      },
    });

    if (!isActive) {
      await tx.refreshToken.updateMany({
        where: {
          userId: targetUserId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId: actorUserId,
        action: isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED",
        resourceType: "USER",
        resourceId: targetUserId,
        metadata: {
          previousStatus: targetUser.isActive,
          newStatus: isActive,
        },
      },
    });

    return {
      ...user,
      emailVerified: Boolean(user.emailVerifiedAt),
      emailVerifiedAt: undefined,
    };
  });
}


module.exports = {
  getMyProfile,
  updateMyProfile,
  getMySecurity,
  listUsers,
  updateUserStatus,
};
