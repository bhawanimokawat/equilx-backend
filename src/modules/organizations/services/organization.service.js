const { prisma } = require("../../../config/database");

const ORGANIZATION_SELECT = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
};

async function createOrganization({ name, slug, createdById }) {
  return prisma.institute.create({
    data: {
      name,
      slug,
      createdById,
    },
    select: ORGANIZATION_SELECT,
  });
}

async function listOrganizations({ page = 1, limit = 20, search }) {
  const where = search
    ? {
        name: {
          contains: search,
          mode: "insensitive",
        },
      }
    : {};

  const [organizations, total] = await prisma.$transaction([
    prisma.institute.findMany({
      where,
      select: ORGANIZATION_SELECT,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.institute.count({ where }),
  ]);

  return {
    data: organizations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getOrganizationById(id) {
  return prisma.institute.findUnique({
    where: { id },
    select: {
      ...ORGANIZATION_SELECT,
      _count: {
        select: {
          memberships: true,
          batches: true,
          subscriptions: true,
        },
      },
    },
  });
}

async function updateOrganization(id, data) {
  return prisma.institute.update({
    where: { id },
    data,
    select: ORGANIZATION_SELECT,
  });
}

async function listOrganizationMembers(instituteId, { page = 1, limit = 20 }) {
  const where = { instituteId };

  const [members, total] = await prisma.$transaction([
    prisma.instituteMembership.findMany({
      where,
      select: {
        id: true,
        role: true,
        status: true,
        joinedAt: true,
        createdAt: true,
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
    data: members,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  createOrganization,
  listOrganizations,
  getOrganizationById,
  updateOrganization,
  listOrganizationMembers,
};
