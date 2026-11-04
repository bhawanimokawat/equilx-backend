
const { prisma } = require("../../../config/database");
const {
  startAttempt,
  submitAttempt,
} = require("../../attempts/services/attempt.service");

function createServiceError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

// Verify the user's active membership and permitted institute role.
async function requireInstituteMembership({
  userId,
  instituteId,
  allowedRoles,
  db = prisma,
}) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
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
      status: true,
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

const ASSIGNMENT_MANAGER_ROLES = [
  "TRAINER",
  "INSTITUTE_ADMIN",
];

async function createAssignment({
  userId,
  instituteId,
  title,
  instructions,
  dueAt,
  contents,
  directUserIds = [],
  batchIds = [],
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ASSIGNMENT_MANAGER_ROLES,
  });

  if (!Array.isArray(contents) || contents.length === 0) {
    throw createServiceError(
      "At least one test must be added to the assignment.",
      400,
      "ASSIGNMENT_CONTENT_REQUIRED"
    );
  }

  const uniqueUserIds = [...new Set(directUserIds)];
  const uniqueBatchIds = [...new Set(batchIds)];

  if (uniqueUserIds.length === 0 && uniqueBatchIds.length === 0) {
    throw createServiceError(
      "Select at least one student or batch.",
      400,
      "ASSIGNMENT_RECIPIENT_REQUIRED"
    );
  }

  const positions = contents.map((item) => item.position);

  if (new Set(positions).size !== positions.length) {
    throw createServiceError(
      "Assignment content positions must be unique.",
      400,
      "DUPLICATE_CONTENT_POSITION"
    );
  }

  const normalizedDueAt = dueAt ? new Date(dueAt) : null;

  if (normalizedDueAt && Number.isNaN(normalizedDueAt.getTime())) {
    throw createServiceError(
      "Invalid assignment due date.",
      400,
      "INVALID_DUE_DATE"
    );
  }

  return prisma.$transaction(async (tx) => {
    // Confirm every selected test version belongs to published content.
    const testVersionIds = [
      ...new Set(contents.map((item) => item.testVersionId)),
    ];

    const publishedVersions = await tx.testVersion.findMany({
      where: {
        id: { in: testVersionIds },
        status: "PUBLISHED",
        test: {
          status: "PUBLISHED",
          book: { isActive: true },
        },
      },
      select: { id: true },
    });

    if (publishedVersions.length !== testVersionIds.length) {
      throw createServiceError(
        "One or more selected tests are unavailable.",
        400,
        "INVALID_ASSIGNMENT_TEST"
      );
    }

    // Validate direct recipients against active institute memberships.
    if (uniqueUserIds.length > 0) {
      const studentMemberships = await tx.instituteMembership.findMany({
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

      if (studentMemberships.length !== uniqueUserIds.length) {
        throw createServiceError(
          "One or more selected users are not active students of this institute.",
          400,
          "INVALID_ASSIGNMENT_STUDENTS"
        );
      }
    }

    // Validate that every selected batch belongs to this institute.
    if (uniqueBatchIds.length > 0) {
      const batches = await tx.batch.findMany({
        where: {
          id: { in: uniqueBatchIds },
          instituteId,
        },
        select: { id: true },
      });

      if (batches.length !== uniqueBatchIds.length) {
        throw createServiceError(
          "One or more selected batches do not belong to this institute.",
          400,
          "INVALID_ASSIGNMENT_BATCHES"
        );
      }
    }

    const assignment = await tx.assignment.create({
      data: {
        instituteId,
        createdByUserId: userId,
        title,
        instructions: instructions ?? null,
        dueAt: normalizedDueAt,
        status: "DRAFT",

        contents: {
          create: contents.map((item) => ({
            testVersionId: item.testVersionId,
            position: item.position,
            instructions: item.instructions ?? null,
          })),
        },

        batchTargets: {
          create: uniqueBatchIds.map((batchId) => ({
            batchId,
          })),
        },
      },
      select: {
        id: true,
        instituteId: true,
        createdByUserId: true,
        title: true,
        instructions: true,
        status: true,
        dueAt: true,
        createdAt: true,
        contents: {
          orderBy: { position: "asc" },
          select: {
            id: true,
            testVersionId: true,
            position: true,
            instructions: true,
          },
        },
        batchTargets: {
          select: {
            batchId: true,
          },
        },
      },
    });

    // Direct recipients are stored as targets when the draft is created.
    if (uniqueUserIds.length > 0) {
      await tx.assignmentTarget.createMany({
        data: uniqueUserIds.map((studentId) => ({
          assignmentId: assignment.id,
          userId: studentId,
          source: "DIRECT",
        })),
      });
    }

    return assignment;
  });
}



async function listAssignments({
  userId,
  instituteId,
  page = 1,
  limit = 20,
  status,
  search,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ASSIGNMENT_MANAGER_ROLES,
  });

  const skip = (page - 1) * limit;

  const where = {
    instituteId,
    ...(status ? { status } : {}),
    ...(search
      ? {
          title: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {}),
  };

  const [assignments, total] = await prisma.$transaction([
    prisma.assignment.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        title: true,
        status: true,
        dueAt: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
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
        _count: {
          select: {
            targets: true,
            contents: true,
          },
        },
      },
    }),

    prisma.assignment.count({ where }),
  ]);

  return {
    assignments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


async function getAssignmentById({
  userId,
  instituteId,
  assignmentId,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ASSIGNMENT_MANAGER_ROLES,
  });

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      instituteId,
    },
    select: {
      id: true,
      instituteId: true,
      createdByUserId: true,
      title: true,
      instructions: true,
      status: true,
      publishedAt: true,
      dueAt: true,
      recipientSnapshotAt: true,
      createdAt: true,
      updatedAt: true,

      createdBy: {
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

      contents: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          testVersionId: true,
          position: true,
          instructions: true,
        },
      },

      batchTargets: {
        select: {
          id: true,
          batchId: true,
          batch: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },

      targets: {
        orderBy: { assignedAt: "desc" },
        select: {
          id: true,
          userId: true,
          source: true,
          sourceBatchId: true,
          status: true,
          assignedAt: true,
          startedAt: true,
          completedAt: true,
          user: {
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
        },
      },
    },
  });

  if (!assignment) {
    throw createServiceError(
      "Assignment not found.",
      404,
      "ASSIGNMENT_NOT_FOUND"
    );
  }

  return assignment;
}



async function publishAssignment({
  userId,
  instituteId,
  assignmentId,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ASSIGNMENT_MANAGER_ROLES,
  });

  return prisma.$transaction(
    async (tx) => {
      const assignment = await tx.assignment.findFirst({
        where: {
          id: assignmentId,
          instituteId,
        },
        select: {
          id: true,
          status: true,
          dueAt: true,
          contents: {
            select: { id: true },
          },
          batchTargets: {
            select: { batchId: true },
          },
          targets: {
            where: { source: "DIRECT" },
            select: { userId: true },
          },
        },
      });

      if (!assignment) {
        throw createServiceError(
          "Assignment not found.",
          404,
          "ASSIGNMENT_NOT_FOUND"
        );
      }

      if (assignment.status !== "DRAFT") {
        throw createServiceError(
          "Only draft assignments can be published.",
          400,
          "ASSIGNMENT_NOT_DRAFT"
        );
      }

      if (assignment.contents.length === 0) {
        throw createServiceError(
          "Assignment must contain at least one test.",
          400,
          "ASSIGNMENT_CONTENT_REQUIRED"
        );
      }

      if (
        assignment.dueAt &&
        assignment.dueAt <= new Date()
      ) {
        throw createServiceError(
          "Assignment due date must be in the future.",
          400,
          "INVALID_ASSIGNMENT_DUE_DATE"
        );
      }

      const batchIds = assignment.batchTargets.map(
        (item) => item.batchId
      );

      // Collect students currently belonging to selected batches.
      const batchMembers = batchIds.length
        ? await tx.batchMember.findMany({
            where: {
              batchId: { in: batchIds },
              batch: { instituteId },
            },
            select: {
              batchId: true,
              userId: true,
            },
          })
        : [];

      const directUserIds = assignment.targets.map(
        (target) => target.userId
      );

      const recipientMap = new Map();

      for (const userId of directUserIds) {
        recipientMap.set(userId, {
          userId,
          source: "DIRECT",
          sourceBatchId: null,
        });
      }

      for (const member of batchMembers) {
        if (!recipientMap.has(member.userId)) {
          recipientMap.set(member.userId, {
            userId: member.userId,
            source: "BATCH",
            sourceBatchId: member.batchId,
          });
        }
      }

      const recipients = [...recipientMap.values()];

      if (recipients.length === 0) {
        throw createServiceError(
          "No eligible students were found for this assignment.",
          400,
          "ASSIGNMENT_RECIPIENT_REQUIRED"
        );
      }

      // Only active institute students can receive assignments.
      const eligibleMemberships =
        await tx.instituteMembership.findMany({
          where: {
            instituteId,
            userId: {
              in: recipients.map((recipient) => recipient.userId),
            },
            role: "INSTITUTE_STUDENT",
            status: "ACTIVE",
            user: {
              isActive: true,
              emailVerifiedAt: { not: null },
            },
          },
          select: {
            userId: true,
          },
        });

      const eligibleUserIds = new Set(
        eligibleMemberships.map((membership) => membership.userId)
      );

      const eligibleRecipients = recipients.filter(
        (recipient) => eligibleUserIds.has(recipient.userId)
      );

      if (eligibleRecipients.length === 0) {
        throw createServiceError(
          "No active institute students are eligible for this assignment.",
          400,
          "NO_ELIGIBLE_ASSIGNMENT_STUDENTS"
        );
      }

      await tx.assignmentTarget.createMany({
        data: eligibleRecipients.map((recipient) => ({
          assignmentId,
          userId: recipient.userId,
          source: recipient.source,
          sourceBatchId: recipient.sourceBatchId,
        })),
        skipDuplicates: true,
      });

      const publishedAt = new Date();

      const updated = await tx.assignment.updateMany({
        where: {
          id: assignmentId,
          instituteId,
          status: "DRAFT",
        },
        data: {
          status: "PUBLISHED",
          publishedAt,
          recipientSnapshotAt: publishedAt,
        },
      });

      if (updated.count !== 1) {
        throw createServiceError(
          "Assignment could not be published.",
          409,
          "ASSIGNMENT_PUBLISH_CONFLICT"
        );
      }

      return {
        assignmentId,
        status: "PUBLISHED",
        publishedAt,
        recipientCount: eligibleRecipients.length,
      };
    },
    {
      isolationLevel: "Serializable",
    }
  );
}


async function closeAssignment({
  userId,
  instituteId,
  assignmentId,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ASSIGNMENT_MANAGER_ROLES,
  });

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      instituteId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!assignment) {
    throw createServiceError(
      "Assignment not found.",
      404,
      "ASSIGNMENT_NOT_FOUND"
    );
  }

  if (assignment.status !== "PUBLISHED") {
    throw createServiceError(
      "Only published assignments can be closed.",
      400,
      "ASSIGNMENT_NOT_PUBLISHED"
    );
  }

  const result = await prisma.assignment.updateMany({
    where: {
      id: assignmentId,
      instituteId,
      status: "PUBLISHED",
    },
    data: {
      status: "CLOSED",
    },
  });

  if (result.count !== 1) {
    throw createServiceError(
      "Assignment could not be closed because its status has changed.",
      409,
      "ASSIGNMENT_CLOSE_CONFLICT"
    );
  }

  return {
    assignmentId,
    status: "CLOSED",
  };
}


async function listAssignmentTargets({
  userId,
  instituteId,
  assignmentId,
  page = 1,
  limit = 20,
  status,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ASSIGNMENT_MANAGER_ROLES,
  });

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      instituteId,
    },
    select: { id: true },
  });

  if (!assignment) {
    throw createServiceError(
      "Assignment not found.",
      404,
      "ASSIGNMENT_NOT_FOUND"
    );
  }

  const skip = (page - 1) * limit;

  const where = {
    assignmentId,
    ...(status ? { status } : {}),
  };

  const [targets, total] = await prisma.$transaction([
    prisma.assignmentTarget.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { assignedAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        userId: true,
        source: true,
        sourceBatchId: true,
        status: true,
        assignedAt: true,
        startedAt: true,
        completedAt: true,
        user: {
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
        completions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            attemptId: true,
            progress: true,
            startedAt: true,
            completedAt: true,
            createdAt: true,
          },
        },
      },
    }),

    prisma.assignmentTarget.count({ where }),
  ]);

  return {
    targets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}



async function listMyAssignments({
  userId,
  instituteId,
  page = 1,
  limit = 20,
  status,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ["INSTITUTE_STUDENT"],
  });

  const skip = (page - 1) * limit;

  const where = {
    userId,
    assignment: {
      instituteId,
      status: { in: ["PUBLISHED", "CLOSED"] },
    },
    ...(status ? { status } : {}),
  };

  const [targets, total] = await prisma.$transaction([
    prisma.assignmentTarget.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { assignedAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        status: true,
        assignedAt: true,
        startedAt: true,
        completedAt: true,
        assignment: {
          select: {
            id: true,
            title: true,
            instructions: true,
            status: true,
            dueAt: true,
            publishedAt: true,
            contents: {
              orderBy: { position: "asc" },
              select: {
                id: true,
                position: true,
                instructions: true,
                testVersionId: true,
              },
            },
          },
        },
        completions: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            progress: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    }),

    prisma.assignmentTarget.count({ where }),
  ]);

  return {
    assignments: targets,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


async function getMyAssignmentById({
  userId,
  instituteId,
  assignmentId,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ["INSTITUTE_STUDENT"],
  });

  const target = await prisma.assignmentTarget.findFirst({
    where: {
      userId,
      assignmentId,
      assignment: {
        instituteId,
        status: { in: ["PUBLISHED", "CLOSED"] },
      },
    },
    select: {
      id: true,
      status: true,
      assignedAt: true,
      startedAt: true,
      completedAt: true,
      assignment: {
        select: {
          id: true,
          title: true,
          instructions: true,
          status: true,
          dueAt: true,
          publishedAt: true,
          contents: {
            orderBy: { position: "asc" },
            select: {
              id: true,
              position: true,
              instructions: true,
              testVersionId: true,
            },
          },
        },
      },
      completions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          attemptId: true,
          progress: true,
          startedAt: true,
          completedAt: true,
        },
      },
    },
  });

  if (!target) {
    throw createServiceError(
      "Assignment not found.",
      404,
      "ASSIGNMENT_NOT_FOUND"
    );
  }

  return target;
}





async function startAssignmentAttempt({
  userId,
  instituteId,
  assignmentId,
  contentId,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ["INSTITUTE_STUDENT"],
  });

  const target = await prisma.assignmentTarget.findFirst({
    where: {
      userId,
      assignmentId,
      assignment: {
        instituteId,
        status: "PUBLISHED",
      },
    },
    select: {
      id: true,
      status: true,
      assignment: {
        select: {
          dueAt: true,
          contents: {
            where: { id: contentId },
            select: {
              testVersionId: true,
            },
          },
        },
      },
    },
  });

  if (!target) {
    throw createServiceError(
      "Assignment not found.",
      404,
      "ASSIGNMENT_NOT_FOUND"
    );
  }

  if (target.status === "COMPLETED" ||
      target.status === "EXCUSED" ||
      target.status === "OVERDUE") {
    throw createServiceError(
      "This assignment cannot be started.",
      409,
      "ASSIGNMENT_NOT_STARTABLE"
    );
  }

  if (target.assignment.dueAt &&
      new Date() >= target.assignment.dueAt) {
    throw createServiceError(
      "The assignment deadline has passed.",
      409,
      "ASSIGNMENT_DEADLINE_PASSED"
    );
  }

  const content = target.assignment.contents[0];

  if (!content) {
    throw createServiceError(
      "Assignment content not found.",
      404,
      "ASSIGNMENT_CONTENT_NOT_FOUND"
    );
  }

  const attempt = await startAttempt({
    userId,
    testVersionId: content.testVersionId,
    usageType: "FULL_MOCK",
  });

  const completion = await prisma.assignmentCompletion.create({
    data: {
      assignmentTargetId: target.id,
      attemptId: attempt.id,
      progress: 0,
      startedAt: new Date(),
    },
    select: {
      id: true,
      assignmentTargetId: true,
      attemptId: true,
      progress: true,
      startedAt: true,
    },
  });

  await prisma.assignmentTarget.update({
    where: { id: target.id },
    data: {
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });

  return {
    completion,
    attempt,
  };
}


async function submitAssignmentAttempt({
  userId,
  instituteId,
  assignmentId,
  completionId,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ["INSTITUTE_STUDENT"],
  });

  const completion = await prisma.assignmentCompletion.findFirst({
    where: {
      id: completionId,
      assignmentTarget: {
        userId,
        assignmentId,
        assignment: {
          instituteId,
        },
      },
    },
    select: {
      id: true,
      attemptId: true,
      completedAt: true,
      assignmentTargetId: true,
    },
  });

  if (!completion || !completion.attemptId) {
    throw createServiceError(
      "Assignment attempt not found.",
      404,
      "ASSIGNMENT_ATTEMPT_NOT_FOUND"
    );
  }

  if (completion.completedAt) {
    throw createServiceError(
      "This assignment attempt is already completed.",
      409,
      "ASSIGNMENT_ALREADY_COMPLETED"
    );
  }

  const result = await submitAttempt({
    userId,
    attemptId: completion.attemptId,
  });

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.assignmentCompletion.update({
      where: { id: completion.id },
      data: {
        progress: 100,
        completedAt: now,
      },
    });

    await tx.assignmentTarget.update({
      where: { id: completion.assignmentTargetId },
      data: {
        status: "COMPLETED",
        completedAt: now,
      },
    });
  });

  return {
    completionId: completion.id,
    assignmentId,
    status: "COMPLETED",
    submittedAttempt: result,
  };
}


async function cancelAssignment({
  userId,
  instituteId,
  assignmentId,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ASSIGNMENT_MANAGER_ROLES,
  });

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      instituteId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!assignment) {
    throw createServiceError(
      "Assignment not found.",
      404,
      "ASSIGNMENT_NOT_FOUND"
    );
  }

  if (!["DRAFT", "PUBLISHED"].includes(assignment.status)) {
    throw createServiceError(
      "This assignment cannot be cancelled.",
      409,
      "ASSIGNMENT_NOT_CANCELLABLE"
    );
  }

  const updated = await prisma.assignment.updateMany({
    where: {
      id: assignmentId,
      instituteId,
      status: assignment.status,
    },
    data: {
      status: "CANCELLED",
    },
  });

  if (updated.count !== 1) {
    throw createServiceError(
      "Assignment status changed. Please try again.",
      409,
      "ASSIGNMENT_UPDATE_CONFLICT"
    );
  }

  return {
    assignmentId,
    status: "CANCELLED",
  };
}



async function updateAssignment({
  userId,
  instituteId,
  assignmentId,
  title,
  instructions,
  dueAt,
  contents,
  directUserIds,
  batchIds,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ASSIGNMENT_MANAGER_ROLES,
  });

  const normalizedUserIds = directUserIds === undefined
    ? undefined
    : [...new Set(directUserIds)];

  const normalizedBatchIds = batchIds === undefined
    ? undefined
    : [...new Set(batchIds)];

  const normalizedDueAt = dueAt === undefined || dueAt === null
    ? dueAt
    : new Date(dueAt);

  if (
    normalizedDueAt instanceof Date &&
    Number.isNaN(normalizedDueAt.getTime())
  ) {
    throw createServiceError(
      "Invalid assignment due date.",
      400,
      "INVALID_DUE_DATE"
    );
  }

  if (contents !== undefined) {
    if (!Array.isArray(contents) || contents.length === 0) {
      throw createServiceError(
        "At least one assignment content is required.",
        400,
        "ASSIGNMENT_CONTENT_REQUIRED"
      );
    }

    const positions = contents.map((item) => item.position);

    if (new Set(positions).size !== positions.length) {
      throw createServiceError(
        "Content positions must be unique.",
        400,
        "DUPLICATE_CONTENT_POSITION"
      );
    }
  }

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.assignment.findFirst({
      where: {
        id: assignmentId,
        instituteId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!assignment) {
      throw createServiceError(
        "Assignment not found.",
        404,
        "ASSIGNMENT_NOT_FOUND"
      );
    }

    if (assignment.status !== "DRAFT") {
      throw createServiceError(
        "Only draft assignments can be updated.",
        409,
        "ASSIGNMENT_NOT_EDITABLE"
      );
    }

    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (instructions !== undefined) {
      updateData.instructions = instructions;
    }
    if (dueAt !== undefined) {
      updateData.dueAt = normalizedDueAt;
    }

    if (contents !== undefined) {
      const testVersionIds = [
        ...new Set(contents.map((item) => item.testVersionId)),
      ];

      const validVersions = await tx.testVersion.findMany({
        where: {
          id: { in: testVersionIds },
          status: "PUBLISHED",
          test: {
            status: "PUBLISHED",
            book: { isActive: true },
          },
        },
        select: { id: true },
      });

      if (validVersions.length !== testVersionIds.length) {
        throw createServiceError(
          "One or more test versions are unavailable.",
          400,
          "INVALID_ASSIGNMENT_TEST"
        );
      }

      await tx.assignmentContent.deleteMany({
        where: { assignmentId },
      });

      await tx.assignmentContent.createMany({
        data: contents.map((item) => ({
          assignmentId,
          testVersionId: item.testVersionId,
          position: item.position,
          instructions: item.instructions ?? null,
        })),
      });
    }

    if (normalizedUserIds !== undefined) {
      if (normalizedUserIds.length > 0) {
        const validStudents = await tx.instituteMembership.findMany({
          where: {
            instituteId,
            userId: { in: normalizedUserIds },
            role: "INSTITUTE_STUDENT",
            status: "ACTIVE",
            user: {
              isActive: true,
              emailVerifiedAt: { not: null },
            },
          },
          select: { userId: true },
        });

        if (validStudents.length !== normalizedUserIds.length) {
          throw createServiceError(
            "One or more students are not eligible.",
            400,
            "INVALID_ASSIGNMENT_STUDENTS"
          );
        }
      }

      await tx.assignmentTarget.deleteMany({
        where: {
          assignmentId,
          source: "DIRECT",
        },
      });

      if (normalizedUserIds.length > 0) {
        await tx.assignmentTarget.createMany({
          data: normalizedUserIds.map((studentId) => ({
            assignmentId,
            userId: studentId,
            source: "DIRECT",
          })),
          skipDuplicates: true,
        });
      }
    }

    if (normalizedBatchIds !== undefined) {
      if (normalizedBatchIds.length > 0) {
        const validBatches = await tx.batch.findMany({
          where: {
            id: { in: normalizedBatchIds },
            instituteId,
          },
          select: { id: true },
        });

        if (validBatches.length !== normalizedBatchIds.length) {
          throw createServiceError(
            "One or more batches are invalid.",
            400,
            "INVALID_ASSIGNMENT_BATCHES"
          );
        }
      }

      await tx.assignmentBatchTarget.deleteMany({
        where: { assignmentId },
      });

      if (normalizedBatchIds.length > 0) {
        await tx.assignmentBatchTarget.createMany({
          data: normalizedBatchIds.map((batchId) => ({
            assignmentId,
            batchId,
          })),
        });
      }
    }

    if (normalizedUserIds !== undefined || normalizedBatchIds !== undefined) {
      const [directCount, batchCount] = await Promise.all([
        tx.assignmentTarget.count({
          where: { assignmentId, source: "DIRECT" },
        }),
        tx.assignmentBatchTarget.count({
          where: { assignmentId },
        }),
      ]);

      if (directCount === 0 && batchCount === 0) {
        throw createServiceError(
          "An assignment must have at least one recipient.",
          400,
          "ASSIGNMENT_RECIPIENT_REQUIRED"
        );
      }
    }

    const updated = await tx.assignment.updateMany({
      where: {
        id: assignmentId,
        instituteId,
        status: "DRAFT",
      },
      data: updateData,
    });

    if (updated.count !== 1) {
      throw createServiceError(
        "Assignment could not be updated.",
        409,
        "ASSIGNMENT_UPDATE_CONFLICT"
      );
    }

    return tx.assignment.findUnique({
      where: { id: assignmentId },
      select: {
        id: true,
        title: true,
        instructions: true,
        status: true,
        dueAt: true,
        updatedAt: true,
      },
    });
  });
}

async function deleteAssignment({
  userId,
  instituteId,
  assignmentId,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ASSIGNMENT_MANAGER_ROLES,
  });

  return prisma.$transaction(async (tx) => {
    const assignment = await tx.assignment.findFirst({
      where: {
        id: assignmentId,
        instituteId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!assignment) {
      throw createServiceError(
        "Assignment not found.",
        404,
        "ASSIGNMENT_NOT_FOUND"
      );
    }

    if (assignment.status !== "DRAFT") {
      throw createServiceError(
        "Only draft assignments can be permanently deleted. Cancel published assignments instead.",
        409,
        "ASSIGNMENT_NOT_DELETABLE"
      );
    }

    // Draft assignments must not have student attempts.
    const completionCount = await tx.assignmentCompletion.count({
      where: {
        assignmentTarget: {
          assignmentId,
        },
      },
    });

    if (completionCount > 0) {
      throw createServiceError(
        "Assignment has completion records and cannot be deleted.",
        409,
        "ASSIGNMENT_HAS_HISTORY"
      );
    }

    await tx.assignmentTarget.deleteMany({
      where: { assignmentId },
    });

    await tx.assignmentBatchTarget.deleteMany({
      where: { assignmentId },
    });

    await tx.assignmentContent.deleteMany({
      where: { assignmentId },
    });

    await tx.assignment.delete({
      where: { id: assignmentId },
    });

    return {
      assignmentId,
      status: "DELETED",
    };
  });
}


async function getAssignmentProgress({
  userId,
  instituteId,
  assignmentId,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ASSIGNMENT_MANAGER_ROLES,
  });

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      instituteId,
    },
    select: {
      id: true,
      title: true,
      status: true,
      dueAt: true,
      publishedAt: true,
      _count: {
        select: {
          targets: true,
        },
      },
    },
  });

  if (!assignment) {
    throw createServiceError(
      "Assignment not found.",
      404,
      "ASSIGNMENT_NOT_FOUND"
    );
  }

  const groupedTargets = await prisma.assignmentTarget.groupBy({
    by: ["status"],
    where: {
      assignmentId,
    },
    _count: {
      id: true,
    },
  });

  const totalStudents = assignment._count.targets;

  const statusCounts = {
    ASSIGNED: 0,
    IN_PROGRESS: 0,
    COMPLETED: 0,
    OVERDUE: 0,
    EXCUSED: 0,
  };

  for (const item of groupedTargets) {
    statusCounts[item.status] = item._count.id;
  }

  const completedStudents = statusCounts.COMPLETED;

  const completionRate = totalStudents > 0
    ? Number(((completedStudents / totalStudents) * 100).toFixed(2))
    : 0;

  const completionProgress = await prisma.assignmentCompletion.aggregate({
    where: {
      assignmentTarget: {
        assignmentId,
      },
    },
    _avg: {
      progress: true,
    },
  });

  return {
    assignment: {
      id: assignment.id,
      title: assignment.title,
      status: assignment.status,
      dueAt: assignment.dueAt,
      publishedAt: assignment.publishedAt,
    },
    summary: {
      totalStudents,
      completedStudents,
      completionRate,
      averageProgress: Number(
        (completionProgress._avg.progress || 0).toFixed(2)
      ),
    },
    studentStatus: statusCounts,
  };
}


async function getAssignmentSubmissions({
  userId,
  instituteId,
  assignmentId,
  page = 1,
  limit = 20,
}) {
  await requireInstituteMembership({
    userId,
    instituteId,
    allowedRoles: ASSIGNMENT_MANAGER_ROLES,
  });

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      instituteId,
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  if (!assignment) {
    throw createServiceError(
      "Assignment not found.",
      404,
      "ASSIGNMENT_NOT_FOUND"
    );
  }

  const skip = (page - 1) * limit;

  const where = {
    assignmentId,
    completions: {
      some: {
        completedAt: { not: null },
        attemptId: { not: null },
      },
    },
  };

  const [submissions, total] = await prisma.$transaction([
    prisma.assignmentTarget.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        { completedAt: "desc" },
        { id: "desc" },
      ],
      select: {
        id: true,
        userId: true,
        status: true,
        assignedAt: true,
        startedAt: true,
        completedAt: true,
        user: {
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
        completions: {
          where: {
            completedAt: { not: null },
            attemptId: { not: null },
          },
          orderBy: { completedAt: "desc" },
          select: {
            id: true,
            attemptId: true,
            progress: true,
            resultSnapshot: true,
            startedAt: true,
            completedAt: true,
          },
        },
      },
    }),

    prisma.assignmentTarget.count({ where }),
  ]);

  return {
    assignment,
    submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}


module.exports = {
  createAssignment,
  listAssignments,
  getAssignmentById,
  publishAssignment,
  closeAssignment,
  listAssignmentTargets,
  listMyAssignments,
  getMyAssignmentById,
  startAssignmentAttempt,
  submitAssignmentAttempt,
  cancelAssignment,
  updateAssignment,
  deleteAssignment,
  getAssignmentProgress,
  getAssignmentSubmissions,
};
