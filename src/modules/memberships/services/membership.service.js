const { prisma } = require("../../../config/database");

const MEMBERSHIP_SELECT = {
  id: true,
  instituteId: true,
  userId: true,
  role: true,
  status: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
};

async function createMembership({ instituteId, userId, role }) {
  return prisma.instituteMembership.create({
    data: {
      instituteId,
      userId,
      role,
    },
    select: MEMBERSHIP_SELECT,
  });
}

async function listMemberships({
  instituteId,
  page = 1,
  limit = 20,
  role,
  status,
}) {
  if (!instituteId) {
    throw new Error("An institute scope is required.");
  }

  const where = {
    instituteId,
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
  };

  const [memberships, total] = await prisma.$transaction([
    prisma.instituteMembership.findMany({
      where,
      select: {
        ...MEMBERSHIP_SELECT,
        user: {
          select: {
            id: true,
            email: true,
            isActive: true,
            profile: {
              select: {
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.instituteMembership.count({ where }),
  ]);

  return {
    data: memberships,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getMembershipById(id, instituteId) {
  if (!instituteId) {
    throw new Error("An institute scope is required.");
  }

  return prisma.instituteMembership.findFirst({
    where: {
      id,
      instituteId,
    },
    select: {
      ...MEMBERSHIP_SELECT,
      user: {
        select: {
          id: true,
          email: true,
          isActive: true,
          profile: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });
}

async function updateMembership(id, instituteId, data) {
  if (!instituteId) {
    throw new Error("An institute scope is required.");
  }

  const result = await prisma.instituteMembership.updateMany({
    where: {
      id,
      instituteId,
    },
    data,
  });

  if (result.count === 0) {
    return null;
  }

  return getMembershipById(id, instituteId);
}

module.exports = {
  createMembership,
  listMemberships,
  getMembershipById,
  updateMembership,
};
