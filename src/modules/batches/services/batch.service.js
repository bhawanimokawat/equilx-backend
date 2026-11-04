const { prisma } = require("../../../config/database");

function createServiceError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

const BATCH_MANAGER_ROLES = ["INSTITUTE_ADMIN", "TRAINER"];

async function requireBatchMembership({
  userId,
  instituteId,
  allowedRoles,
  db = prisma,
}) {
  if (!userId) {
    throw createServiceError(
      "Authentication required.",
      401,
      "UNAUTHORIZED"
    );
  }

  if (!instituteId) {
    throw createServiceError(
      "Institute ID is required.",
      400,
      "INSTITUTE_ID_REQUIRED"
    );
  }

  const membership = await db.instituteMembership.findFirst({
    where: {
      userId,
      instituteId,
      status: "ACTIVE",
      role: { in: allowedRoles },
      user: {
        isActive: true,
        emailVerifiedAt: { not: null },
      },
    },
    select: {
      id: true,
      instituteId: true,
      userId: true,
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

// Verify that the selected trainer belongs to this institute.
async function validateBatchTrainer({
  tx,
  instituteId,
  trainerId,
}) {
  if (!trainerId) return;

  const trainer = await tx.instituteMembership.findFirst({
    where: {
      instituteId,
      userId: trainerId,
      role: "TRAINER",
      status: "ACTIVE",
      user: {
        isActive: true,
        emailVerifiedAt: { not: null },
      },
    },
    select: { id: true },
  });

  if (!trainer) {
    throw createServiceError(
      "Selected trainer is not an active trainer of this institute.",
      400,
      "INVALID_BATCH_TRAINER"
    );
  }
}

// 1. Create batch
async function createBatch({
  userId,
  instituteId,
  name,
  trainerId,
}) {
  const membership = await requireBatchMembership({
    userId,
    instituteId,
    allowedRoles: ["INSTITUTE_ADMIN"],
  });

  return prisma.$transaction(async (tx) => {
    await validateBatchTrainer({
      tx,
      instituteId,
      trainerId,
    });

    return tx.batch.create({
      data: {
        instituteId,
        name,
        createdById: membership.userId,
        trainerId: trainerId ?? null,
      },
      select: {
        id: true,
        instituteId: true,
        name: true,
        trainerId: true,
        createdAt: true,
        trainer: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });
  });
}

// 2. List institute batches
async function listBatches({
  userId,
  instituteId,
  page = 1,
  limit = 20,
  search,
  trainerId,
}) {
  const membership = await requireBatchMembership({
    userId,
    instituteId,
    allowedRoles: BATCH_MANAGER_ROLES,
  });

  const skip = (page - 1) * limit;

  const where = {
    instituteId,
    ...(search
      ? { name: { contains: search, mode: "insensitive" } }
      : {}),
    ...(trainerId ? { trainerId } : {}),
    ...(membership.role === "TRAINER"
      ? { trainerId: userId }
      : {}),
  };

  const [batches, total] = await prisma.$transaction([
    prisma.batch.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        name: true,
        trainerId: true,
        createdAt: true,
        updatedAt: true,
        trainer: {
          select: {
            id: true,
            email: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    }),
    prisma.batch.count({ where }),
  ]);

  return {
    batches,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// 3. Get batch details
async function getBatchById({
  userId,
  instituteId,
  batchId,
}) {
  const membership = await requireBatchMembership({
    userId,
    instituteId,
    allowedRoles: BATCH_MANAGER_ROLES,
  });

  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      instituteId,
      ...(membership.role === "TRAINER"
        ? { trainerId: userId }
        : {}),
    },
    select: {
      id: true,
      name: true,
      instituteId: true,
      trainerId: true,
      createdAt: true,
      updatedAt: true,
      trainer: {
        select: {
          id: true,
          email: true,
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!batch) {
    throw createServiceError(
      "Batch not found.",
      404,
      "BATCH_NOT_FOUND"
    );
  }

  return batch;
}

// 4. Update batch name or trainer
async function updateBatch({
  userId,
  instituteId,
  batchId,
  name,
  trainerId,
}) {
  await requireBatchMembership({
    userId,
    instituteId,
    allowedRoles: ["INSTITUTE_ADMIN"],
  });

  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findFirst({
      where: {
        id: batchId,
        instituteId,
      },
      select: { id: true },
    });

    if (!batch) {
      throw createServiceError(
        "Batch not found.",
        404,
        "BATCH_NOT_FOUND"
      );
    }

    if (trainerId !== undefined) {
      await validateBatchTrainer({
        tx,
        instituteId,
        trainerId,
      });
    }

    const updated = await tx.batch.update({
      where: { id: batchId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(trainerId !== undefined ? { trainerId } : {}),
      },
      select: {
        id: true,
        name: true,
        trainerId: true,
        updatedAt: true,
        trainer: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    return updated;
  });
}

// 5. Delete batch
async function deleteBatch({
  userId,
  instituteId,
  batchId,
}) {
  await requireBatchMembership({
    userId,
    instituteId,
    allowedRoles: ["INSTITUTE_ADMIN"],
  });

  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findFirst({
      where: {
        id: batchId,
        instituteId,
      },
      select: {
        id: true,
        _count: {
          select: {
            assignmentTargets: true,
          },
        },
      },
    });

    if (!batch) {
      throw createServiceError(
        "Batch not found.",
        404,
        "BATCH_NOT_FOUND"
      );
    }

    if (batch._count.assignmentTargets > 0) {
      throw createServiceError(
        "This batch is referenced by assignments and cannot be deleted.",
        409,
        "BATCH_HAS_ASSIGNMENT_HISTORY"
      );
    }

    await tx.batch.delete({
      where: { id: batchId },
    });

    return {
      batchId,
      status: "DELETED",
    };
  });
}

// 6. Add students to batch
async function addBatchMembers({
  userId,
  instituteId,
  batchId,
  userIds,
}) {
  const membership = await requireBatchMembership({
    userId,
    instituteId,
    allowedRoles: BATCH_MANAGER_ROLES,
  });

  const uniqueUserIds = [...new Set(userIds)];

  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findFirst({
      where: {
        id: batchId,
        instituteId,
        ...(membership.role === "TRAINER"
          ? { trainerId: userId }
          : {}),
      },
      select: { id: true },
    });

    if (!batch) {
      throw createServiceError(
        "Batch not found or you are not assigned to it.",
        404,
        "BATCH_NOT_FOUND"
      );
    }

    const students = await tx.instituteMembership.findMany({
      where: {
        instituteId,
        userId: { in: uniqueUserIds },
        role: "INSTITUTE_STUDENT",
        status: "ACTIVE",
        user: {
          isActive: true,
          emailVerifiedAt: { not: null },
        },
      },
      select: { userId: true },
    });

    if (students.length !== uniqueUserIds.length) {
      throw createServiceError(
        "One or more users are not active students of this institute.",
        400,
        "INVALID_BATCH_STUDENTS"
      );
    }

    const result = await tx.batchMember.createMany({
      data: uniqueUserIds.map((studentId) => ({
        batchId,
        userId: studentId,
      })),
      skipDuplicates: true,
    });

    return {
      batchId,
      requestedCount: uniqueUserIds.length,
      addedCount: result.count,
      alreadyMembersCount: uniqueUserIds.length - result.count,
    };
  });
}

// 7. List batch members
async function listBatchMembers({
  userId,
  instituteId,
  batchId,
  page = 1,
  limit = 20,
  search,
}) {
  const membership = await requireBatchMembership({
    userId,
    instituteId,
    allowedRoles: BATCH_MANAGER_ROLES,
  });

  const batch = await prisma.batch.findFirst({
    where: {
      id: batchId,
      instituteId,
      ...(membership.role === "TRAINER"
        ? { trainerId: userId }
        : {}),
    },
    select: { id: true },
  });

  if (!batch) {
    throw createServiceError(
      "Batch not found or you are not assigned to it.",
      404,
      "BATCH_NOT_FOUND"
    );
  }

  const skip = (page - 1) * limit;

  const where = {
    batchId,
    ...(search
      ? {
          user: {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              {
                profile: {
                  is: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          },
        }
      : {}),
  };

  const [members, total] = await prisma.$transaction([
    prisma.batchMember.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { addedAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        userId: true,
        addedAt: true,
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
    }),
    prisma.batchMember.count({ where }),
  ]);

  return {
    members,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

// 8. Remove student from batch
async function removeBatchMember({
  userId,
  instituteId,
  batchId,
  studentId,
}) {
  const membership = await requireBatchMembership({
    userId,
    instituteId,
    allowedRoles: BATCH_MANAGER_ROLES,
  });

  return prisma.$transaction(async (tx) => {
    const batch = await tx.batch.findFirst({
      where: {
        id: batchId,
        instituteId,
        ...(membership.role === "TRAINER"
          ? { trainerId: userId }
          : {}),
      },
      select: { id: true },
    });

    if (!batch) {
      throw createServiceError(
        "Batch not found or you are not assigned to it.",
        404,
        "BATCH_NOT_FOUND"
      );
    }

    const result = await tx.batchMember.deleteMany({
      where: {
        batchId,
        userId: studentId,
      },
    });

    if (result.count !== 1) {
      throw createServiceError(
        "Student is not a member of this batch.",
        404,
        "BATCH_MEMBER_NOT_FOUND"
      );
    }

    return {
      batchId,
      studentId,
      status: "REMOVED",
    };
  });
}

// 9. Student's own batches
async function listMyBatches({
  userId,
  instituteId,
  page = 1,
  limit = 20,
}) {
  await requireBatchMembership({
    userId,
    instituteId,
    allowedRoles: ["INSTITUTE_STUDENT"],
  });

  const where = {
    userId,
    batch: {
      instituteId,
    },
  };

  const skip = (page - 1) * limit;

  const [memberships, total] = await prisma.$transaction([
    prisma.batchMember.findMany({
      where,
      skip,
      take: limit,
      orderBy: { addedAt: "desc" },
      select: {
        addedAt: true,
        batch: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            trainer: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.batchMember.count({ where }),
  ]);

  return {
    batches: memberships.map((item) => ({
      ...item.batch,
      joinedAt: item.addedAt,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

module.exports = {
  createBatch,
  listBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  addBatchMembers,
  listBatchMembers,
  removeBatchMember,
  listMyBatches,
};
