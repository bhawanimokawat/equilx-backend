const { prisma } = require("../../../config/database");
const { parse } = require("csv-parse/sync");

const LEAD_SELECT = {
  id: true,
  instituteId: true,
  createdById: true,
  ownerId: true,
  sourceId: true,
  convertedUserId: true,
  name: true,
  email: true,
  phone: true,
  interestedIn: true,
  status: true,
  notes: true,
  nextFollowUpAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  targetBand: true,
  examDate: true,
  tags: true,
};

function createServiceError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function requireInstituteScope(instituteId) {
  if (!instituteId) {
    throw createServiceError(
      "An institute scope is required.",
      400,
      "INSTITUTE_SCOPE_REQUIRED"
    );
  }
}

function leadAccessWhere(scope) {
  const where = {
    instituteId: scope.instituteId,
    deletedAt: null,
  };

  if (scope.role === "TRAINER") {
    where.ownerId = scope.userId;
  }

  return where;
}

async function validateLeadOwner(tx, instituteId, ownerId) {
  if (!ownerId) return;

  const membership = await tx.instituteMembership.findFirst({
    where: {
      instituteId,
      userId: ownerId,
      role: { in: ["INSTITUTE_ADMIN", "TRAINER"] },
      status: "ACTIVE",
      institute: { status: "ACTIVE" },
      user: { isActive: true, emailVerifiedAt: { not: null } },
    },
    select: { id: true },
  });

  if (!membership) {
    throw createServiceError(
      "The lead owner must have an active membership in this institute.",
      400,
      "INVALID_LEAD_OWNER"
    );
  }
}

async function validateLeadSource(tx, instituteId, sourceId) {
  if (!sourceId) return;

  const source = await tx.leadSource.findFirst({
    where: {
      id: sourceId,
      instituteId,
      isActive: true,
    },
    select: { id: true },
  });

  if (!source) {
    throw createServiceError(
      "The selected lead source is unavailable for this institute.",
      400,
      "INVALID_LEAD_SOURCE"
    );
  }
}

async function createLead(scope, input) {
  requireInstituteScope(scope?.instituteId);

  if (!scope.userId) {
    throw createServiceError(
      "An authenticated user is required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  if (scope.role === "TRAINER" && input.ownerId &&
    input.ownerId !== scope.userId) {
    throw createServiceError(
      "Trainers can only create leads assigned to themselves.",
      403,
      "LEAD_ASSIGNMENT_FORBIDDEN"
    );
  }

  const ownerId =
    scope.role === "TRAINER" ? scope.userId : input.ownerId ?? null;

  return prisma.$transaction(async (tx) => {
    await validateLeadOwner(tx, scope.instituteId, ownerId);
    await validateLeadSource(tx, scope.instituteId, input.sourceId);

    const lead = await tx.lead.create({
      data: {
        instituteId: scope.instituteId,
        createdById: scope.userId,
        ownerId,
        sourceId: input.sourceId ?? null,
        name: input.name,
        email: input.email ?? null,
        phone: input.phone ?? null,
        interestedIn: input.interestedIn ?? null,
        notes: input.notes ?? null,
        nextFollowUpAt: input.nextFollowUpAt ?? null,
        targetBand: input.targetBand ?? null,
        examDate: input.examDate ?? null,
        tags: input.tags ?? [],
      },
      select: LEAD_SELECT,
    });

    await tx.leadStatusHistory.create({
      data: {
        leadId: lead.id,
        changedById: scope.userId,
        previousStatus: null,
        newStatus: "NEW",
        reason: "Lead created",
      },
    });

    if (ownerId) {
      await tx.leadAssignment.create({
        data: {
          leadId: lead.id,
          assignedToId: ownerId,
          assignedById: scope.userId,
          note: "Initial lead assignment",
        },
      });
    }

    return lead;
  });
}

async function listLeads(scope, options = {}) {
  requireInstituteScope(scope?.instituteId);

  const {
    page = 1,
    limit = 20,
    status,
    ownerId,
    search,
    dueFollowUps,
  } = options;

  const where = leadAccessWhere(scope);

  if (status) where.status = status;

  if (scope.role !== "TRAINER" && ownerId) {
    where.ownerId = ownerId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  if (dueFollowUps === "true") {
    where.nextFollowUpAt = { lte: new Date() };
  } else if (dueFollowUps === "false") {
    where.nextFollowUpAt = null;
  }

  const [leads, total] = await prisma.$transaction([
    prisma.lead.findMany({
      where,
      select: {
        ...LEAD_SELECT,
        source: {
          select: { id: true, name: true },
        },
        owner: {
          select: {
            id: true,
            email: true,
            profile: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    data: leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getLeadById(scope, leadId) {
  requireInstituteScope(scope?.instituteId);

  return prisma.lead.findFirst({
    where: {
      ...leadAccessWhere(scope),
      id: leadId,
    },
    select: {
      ...LEAD_SELECT,
      source: { select: { id: true, name: true } },
      owner: {
        select: {
          id: true,
          email: true,
          profile: { select: { name: true } },
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          actorId: true,
          type: true,
          subject: true,
          description: true,
          outcome: true,
          followUpAt: true,
          createdAt: true,
        },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          changedById: true,
          previousStatus: true,
          newStatus: true,
          reason: true,
          createdAt: true,
        },
      },
    },
  });
}


async function updateLead(scope, leadId, input) {
  requireInstituteScope(scope?.instituteId);

  if (!scope.userId) {
    throw createServiceError(
      "An authenticated user is required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  if (
    scope.role === "TRAINER" &&
    (Object.hasOwn(input, "ownerId") ||
      Object.hasOwn(input, "sourceId") ||
      input.status === "ENROLLED")
  ) {
    throw createServiceError(
      "Trainers cannot change lead ownership, source, or conversion status.",
      403,
      "LEAD_UPDATE_FORBIDDEN"
    );
  }

  return prisma.$transaction(async (tx) => {
    const where = {
      ...leadAccessWhere(scope),
      id: leadId,
    };

    const existing = await tx.lead.findFirst({
      where,
      select: {
        id: true,
        status: true,
        email: true,
        phone: true,
        ownerId: true,
      },
    });

    if (!existing) return null;

    // Validate the final contact details, not just the submitted fields.
    const finalEmail = Object.hasOwn(input, "email")
      ? input.email
      : existing.email;

    const finalPhone = Object.hasOwn(input, "phone")
      ? input.phone
      : existing.phone;

    if (!finalEmail && !finalPhone) {
      throw createServiceError(
        "A lead must retain an email address or phone number.",
        400,
        "LEAD_CONTACT_REQUIRED"
      );
    }

    if (Object.hasOwn(input, "ownerId")) {
      await validateLeadOwner(
        tx,
        scope.instituteId,
        input.ownerId
      );
    }

    if (Object.hasOwn(input, "sourceId")) {
      await validateLeadSource(
        tx,
        scope.instituteId,
        input.sourceId
      );
    }

    // Conversion must use a dedicated workflow.
    if (
      input.status === "ENROLLED" &&
      existing.status !== "ENROLLED"
    ) {
      throw createServiceError(
        "Use the lead conversion workflow to enroll a lead.",
        400,
        "LEAD_CONVERSION_REQUIRED"
      );
    }
    const { status, ownerId, ...fields } = input;

    const updated = await tx.lead.update({
      where: { id: existing.id },
      data: {
        ...fields,
        ...(status !== undefined ? { status } : {}),
        ...(Object.hasOwn(input, "ownerId") ? { ownerId } : {}),
      },
      select: LEAD_SELECT,
    });

    if (status && status !== existing.status) {
      await tx.leadStatusHistory.create({
        data: {
          leadId: existing.id,
          changedById: scope.userId,
          previousStatus: existing.status,
          newStatus: status,
          reason: "Lead updated",
        },
      });
    }

    if (Object.hasOwn(input, "ownerId")) {
      await tx.leadAssignment.updateMany({
        where: {
          leadId: existing.id,
          endedAt: null,
        },
        data: {
          endedAt: new Date(),
        },
      });

      if (ownerId) {
        await tx.leadAssignment.create({
          data: {
            leadId: existing.id,
            assignedToId: ownerId,
            assignedById: scope.userId,
            note: "Lead reassigned",
          },
        });
      }
    }

    return updated;
  });
}

async function softDeleteLead(scope, leadId) {
  requireInstituteScope(scope?.instituteId);

  if (scope.role === "TRAINER") {
    throw createServiceError(
      "Trainers cannot delete leads.",
      403,
      "LEAD_DELETE_FORBIDDEN"
    );
  }

  const result = await prisma.lead.updateMany({
    where: {
      instituteId: scope.instituteId,
      id: leadId,
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });

  return result.count > 0;
}


async function updateLeadStatus(scope, leadId, input) {
  requireInstituteScope(scope?.instituteId);

  if (!scope.userId) {
    throw createServiceError(
      "An authenticated user is required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  const allowedStatuses = [
    "NEW",
    "CONTACTED",
    "DEMO_BOOKED",
    "NEGOTIATION",
    "ENROLLED",
    "LOST",
  ];

  if (!allowedStatuses.includes(input.status)) {
    throw createServiceError(
      "Invalid lead pipeline stage.",
      400,
      "INVALID_LEAD_STATUS"
    );
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.lead.findFirst({
      where: {
        ...leadAccessWhere(scope),
        id: leadId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existing) return null;

    if (existing.status === input.status) {
      return tx.lead.findUnique({
        where: { id: existing.id },
        select: LEAD_SELECT,
      });
    }

    const updated = await tx.lead.update({
      where: { id: existing.id },
      data: { status: input.status },
      select: LEAD_SELECT,
    });

    await tx.leadStatusHistory.create({
      data: {
        leadId: existing.id,
        changedById: scope.userId,
        previousStatus: existing.status,
        newStatus: input.status,
        reason: input.reason ?? null,
      },
    });

    return updated;
  });
}

async function getLeadStatusHistory(scope, leadId) {
  requireInstituteScope(scope?.instituteId);

  const lead = await prisma.lead.findFirst({
    where: {
      ...leadAccessWhere(scope),
      id: leadId,
    },
    select: { id: true },
  });

  if (!lead) return null;

  return prisma.leadStatusHistory.findMany({
    where: { leadId: lead.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      changedById: true,
      previousStatus: true,
      newStatus: true,
      reason: true,
      createdAt: true,
    },
  });
}



async function assignLead(scope, leadId, input) {
  requireInstituteScope(scope?.instituteId);

  if (!scope.userId) {
    throw createServiceError(
      "An authenticated user is required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  if (scope.role === "TRAINER") {
    throw createServiceError(
      "Trainers cannot assign or reassign leads.",
      403,
      "LEAD_ASSIGNMENT_FORBIDDEN"
    );
  }

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({
      where: {
        ...leadAccessWhere(scope),
        id: leadId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!lead) return null;

    await validateLeadOwner(
      tx,
      scope.instituteId,
      input.assignedToId
    );

    // Avoid duplicate history when the owner has not changed.
    if (lead.ownerId === input.assignedToId) {
      return tx.lead.findUnique({
        where: { id: lead.id },
        select: LEAD_SELECT,
      });
    }

    const now = new Date();

    await tx.leadAssignment.updateMany({
      where: {
        leadId: lead.id,
        endedAt: null,
      },
      data: {
        endedAt: now,
      },
    });

    const updatedLead = await tx.lead.update({
      where: { id: lead.id },
      data: {
        ownerId: input.assignedToId,
      },
      select: LEAD_SELECT,
    });

    await tx.leadAssignment.create({
      data: {
        leadId: lead.id,
        assignedToId: input.assignedToId,
        assignedById: scope.userId,
        assignedAt: now,
        note: input.note ?? null,
      },
    });

    return updatedLead;
  });
}

async function getLeadAssignmentHistory(scope, leadId) {
  requireInstituteScope(scope?.instituteId);

  const lead = await prisma.lead.findFirst({
    where: {
      ...leadAccessWhere(scope),
      id: leadId,
    },
    select: { id: true },
  });

  if (!lead) return null;

  return prisma.leadAssignment.findMany({
    where: { leadId: lead.id },
    orderBy: { assignedAt: "desc" },
    take: 100,
    select: {
      id: true,
      assignedAt: true,
      endedAt: true,
      note: true,
      assignedTo: {
        select: {
          id: true,
          email: true,
          profile: {
            select: { name: true },
          },
        },
      },
      assignedBy: {
        select: {
          id: true,
          email: true,
          profile: {
            select: { name: true },
          },
        },
      },
    },
  });
}

async function listAssignableUsers(scope) {
  requireInstituteScope(scope?.instituteId);

  const memberships = await prisma.instituteMembership.findMany({
    where: {
      instituteId: scope.instituteId,
      role: {
        in: ["INSTITUTE_ADMIN", "TRAINER"],
      },
      status: "ACTIVE",
      institute: {
        status: "ACTIVE",
      },
      user: {
        isActive: true,
        emailVerifiedAt: { not: null },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      role: true,
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
  });

  return memberships.map((membership) => ({
    ...membership.user,
    membershipRole: membership.role,
  }));
}



async function createLeadFollowUp(scope, leadId, input) {
  requireInstituteScope(scope?.instituteId);

  if (!scope.userId) {
    throw createServiceError(
      "An authenticated user is required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({
      where: {
        ...leadAccessWhere(scope),
        id: leadId,
      },
      select: { id: true, ownerId: true },
    });

    if (!lead) return null;

    const assignedToId = input.assignedToId || scope.userId;

    // Trainers can create follow-ups only for themselves.
    if (scope.role === "TRAINER" && assignedToId !== scope.userId) {
      throw createServiceError(
        "Trainers can only assign follow-ups to themselves.",
        403,
        "FOLLOW_UP_ASSIGNMENT_FORBIDDEN"
      );
    }

    await validateLeadOwner(
      tx,
      scope.instituteId,
      assignedToId
    );

    return tx.leadFollowUp.create({
      data: {
        leadId: lead.id,
        title: input.title,
        notes: input.notes ?? null,
        dueAt: input.dueAt,
        assignedToId,
        createdById: scope.userId,
      },
      select: {
        id: true,
        leadId: true,
        title: true,
        notes: true,
        dueAt: true,
        status: true,
        completedAt: true,
        assignedToId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });
}

async function listLeadFollowUps(scope, filters = {}) {
  requireInstituteScope(scope?.instituteId);

  const page = filters.page || 1;
  const limit = filters.limit || 20;
  const now = new Date();

  const where = {
    lead: {
      instituteId: scope.instituteId,
      deletedAt: null,
      ...(scope.role === "TRAINER"
        ? { ownerId: scope.userId }
        : {}),
    },
  };

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.assignedToId) {
    where.assignedToId = filters.assignedToId;
  }

  if (filters.due === "overdue") {
    where.status = "PENDING";
    where.dueAt = { lt: now };
  } else if (filters.due === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    where.status = "PENDING";
    where.dueAt = { gte: start, lt: end };
  } else if (filters.due === "upcoming") {
    const endOfToday = new Date(now);
    endOfToday.setHours(0, 0, 0, 0);
    endOfToday.setDate(endOfToday.getDate() + 1);

    where.status = "PENDING";
    where.dueAt = { gte: endOfToday };
  }

  const [items, total] = await prisma.$transaction([
    prisma.leadFollowUp.findMany({
      where,
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        leadId: true,
        title: true,
        notes: true,
        dueAt: true,
        status: true,
        completedAt: true,
        assignedToId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        lead: {
          select: {
            name: true,
            phone: true,
            email: true,
            ownerId: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            email: true,
            profile: { select: { name: true } },
          },
        },
      },
    }),
    prisma.leadFollowUp.count({ where }),
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

async function updateLeadFollowUpStatus(
  scope,
  followUpId,
  nextStatus
) {
  requireInstituteScope(scope?.instituteId);

  if (!scope.userId) {
    throw createServiceError(
      "An authenticated user is required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  if (!["COMPLETED", "CANCELLED"].includes(nextStatus)) {
    throw createServiceError(
      "Invalid follow-up status transition.",
      400,
      "INVALID_FOLLOW_UP_STATUS"
    );
  }

  return prisma.$transaction(async (tx) => {
    const followUp = await tx.leadFollowUp.findFirst({
      where: {
        id: followUpId,
        lead: {
          ...leadAccessWhere(scope),
        },
      },
      select: {
        id: true,
        status: true,
        assignedToId: true,
      },
    });

    if (!followUp) return null;

    // Only the assigned user or an institute admin can update the task.
    if (
      scope.role === "TRAINER" &&
      followUp.assignedToId !== scope.userId
    ) {
      throw createServiceError(
        "You can only update follow-ups assigned to you.",
        403,
        "FOLLOW_UP_ACCESS_FORBIDDEN"
      );
    }

    if (followUp.status !== "PENDING") {
      throw createServiceError(
        "Only pending follow-ups can be completed or cancelled.",
        409,
        "FOLLOW_UP_ALREADY_CLOSED"
      );
    }

    return tx.leadFollowUp.update({
      where: { id: followUp.id },
      data: {
        status: nextStatus,
        completedAt:
          nextStatus === "COMPLETED" ? new Date() : null,
      },
      select: {
        id: true,
        leadId: true,
        title: true,
        notes: true,
        dueAt: true,
        status: true,
        completedAt: true,
        assignedToId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });
}



async function createLeadActivity(scope, leadId, input) {
  requireInstituteScope(scope?.instituteId);

  if (!scope.userId) {
    throw createServiceError(
      "An authenticated user is required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findFirst({
      where: {
        ...leadAccessWhere(scope),
        id: leadId,
      },
      select: { id: true },
    });

    if (!lead) return null;

    return tx.leadActivity.create({
      data: {
        leadId: lead.id,
        createdById: scope.userId,
        type: input.type,
        subject: input.subject ?? null,
        description: input.description ?? null,
        outcome: input.outcome ?? null,
        followUpAt: input.followUpAt ?? null,
      },
      select: {
        id: true,
        leadId: true,
        createdById: true,
        type: true,
        subject: true,
        description: true,
        outcome: true,
        followUpAt: true,
        createdAt: true,
      },
    });
  });
}

async function listLeadActivities(scope, leadId, page = 1, limit = 20) {
  requireInstituteScope(scope?.instituteId);

  const lead = await prisma.lead.findFirst({
    where: {
      ...leadAccessWhere(scope),
      id: leadId,
    },
    select: { id: true },
  });

  if (!lead) return null;

  const where = { leadId: lead.id };

  const [items, total] = await prisma.$transaction([
    prisma.leadActivity.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        type: true,
        subject: true,
        description: true,
        outcome: true,
        followUpAt: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            profile: { select: { name: true } },
          },
        },
      },
    }),
    prisma.leadActivity.count({ where }),
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


async function createLeadSource(scope, input) {
  requireInstituteScope(scope?.instituteId);

  if (!scope.userId) {
    throw createServiceError(
      "An authenticated user is required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  if (scope.role === "TRAINER") {
    throw createServiceError(
      "Trainers cannot manage lead sources.",
      403,
      "LEAD_SOURCE_MANAGEMENT_FORBIDDEN"
    );
  }

  const name = input.name.trim();

  const existing = await prisma.leadSource.findFirst({
    where: {
      instituteId: scope.instituteId,
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existing) {
    throw createServiceError(
      "A lead source with this name already exists.",
      409,
      "LEAD_SOURCE_ALREADY_EXISTS"
    );
  }

  return prisma.leadSource.create({
    data: {
      instituteId: scope.instituteId,
      name,
    },
    select: {
      id: true,
      instituteId: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function listLeadSources(scope, includeInactive = false) {
  requireInstituteScope(scope?.instituteId);

  return prisma.leadSource.findMany({
    where: {
      instituteId: scope.instituteId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      instituteId: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

async function updateLeadSource(scope, sourceId, input) {
  requireInstituteScope(scope?.instituteId);

  if (!scope.userId) {
    throw createServiceError(
      "An authenticated user is required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  if (scope.role === "TRAINER") {
    throw createServiceError(
      "Trainers cannot manage lead sources.",
      403,
      "LEAD_SOURCE_MANAGEMENT_FORBIDDEN"
    );
  }

  const source = await prisma.leadSource.findFirst({
    where: {
      id: sourceId,
      instituteId: scope.instituteId,
    },
    select: { id: true },
  });

  if (!source) return null;

  if (input.name !== undefined) {
    const name = input.name.trim();

    const duplicate = await prisma.leadSource.findFirst({
      where: {
        instituteId: scope.instituteId,
        id: { not: sourceId },
        name: { equals: name, mode: "insensitive" },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw createServiceError(
        "A lead source with this name already exists.",
        409,
        "LEAD_SOURCE_ALREADY_EXISTS"
      );
    }
  }

  return prisma.leadSource.update({
    where: { id: sourceId },
    data: {
      ...(input.name !== undefined
        ? { name: input.name.trim() }
        : {}),
      ...(input.isActive !== undefined
        ? { isActive: input.isActive }
        : {}),
    },
    select: {
      id: true,
      instituteId: true,
      name: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}



function escapeCsvCell(value) {
  if (value === null || value === undefined) {
    return '""';
  }

  let text = Array.isArray(value)
    ? value.join("; ")
    : value instanceof Date
      ? value.toISOString()
      : String(value);

  // Protect spreadsheet users against CSV formula injection.
  if (/^[\s]*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

async function exportLeadsCsv(scope) {
  requireInstituteScope(scope?.instituteId);

  const leads = await prisma.lead.findMany({
    where: leadAccessWhere(scope),
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      interestedIn: true,
      status: true,
      targetBand: true,
      examDate: true,
      tags: true,
      notes: true,
      nextFollowUpAt: true,
      createdAt: true,
    },
  });

  const columns = [
    "Lead ID",
    "Name",
    "Email",
    "Phone",
    "Interested Course",
    "Status",
    "Target Band",
    "Exam Date",
    "Tags",
    "Notes",
    "Next Follow-up",
    "Created At",
  ];

  const rows = leads.map((lead) => [
    lead.id,
    lead.name,
    lead.email,
    lead.phone,
    lead.interestedIn,
    lead.status,
    lead.targetBand,
    lead.examDate,
    lead.tags,
    lead.notes,
    lead.nextFollowUpAt,
    lead.createdAt,
  ]);

  return [
    columns.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\r\n");
}



function normalizeLeadPhone(phone) {
  if (!phone) return null;
  return String(phone).replace(/\D/g, "");
}

async function importLeadsCsv(scope, csv) {
  requireInstituteScope(scope?.instituteId);

  if (!scope.userId) {
    throw createServiceError(
      "An authenticated user is required.",
      401,
      "AUTHENTICATION_REQUIRED"
    );
  }

  let rows;

  try {
    rows = parse(csv, {
      columns: (headers) => headers.map((h) => h.trim()),
      skip_empty_lines: true,
      trim: true,
      bom: true,
      relax_column_count: false,
    });
  } catch {
    throw createServiceError(
      "The CSV file could not be parsed. Check its headers and formatting.",
      400,
      "INVALID_CSV"
    );
  }

  if (rows.length > 500) {
    throw createServiceError(
      "A maximum of 500 leads can be imported per request.",
      400,
      "CSV_ROW_LIMIT_EXCEEDED"
    );
  }

  const allowedHeaders = new Set([
    "name",
    "email",
    "phone",
    "interestedIn",
    "sourceId",
    "ownerId",
    "notes",
    "nextFollowUpAt",
    "targetBand",
    "examDate",
    "tags",
  ]);

  const headers = Object.keys(rows[0] || {});
  const invalidHeaders = headers.filter((h) => !allowedHeaders.has(h));

  if (
    !headers.includes("name") ||
    (!headers.includes("email") && !headers.includes("phone")) ||
    invalidHeaders.length
  ) {
    throw createServiceError(
      "CSV must contain name and at least one of email or phone. Check the column names.",
      400,
      "INVALID_CSV_HEADERS"
    );
  }

  const existingLeads = await prisma.lead.findMany({
    where: {
      instituteId: scope.instituteId,
      deletedAt: null,
      phone: { not: null },
    },
    select: { phone: true },
  });

  const existingPhones = new Set(
    existingLeads
      .map((lead) => normalizeLeadPhone(lead.phone))
      .filter(Boolean)
  );

  const seenPhones = new Set();
  const report = {
    totalRows: rows.length,
    imported: 0,
    rejected: 0,
    results: [],
  };

  for (let index = 0; index < rows.length; index += 1) {
    const rowNumber = index + 2;
    const row = rows[index];

    const phone = String(row.phone || "").trim();
    const normalizedPhone = normalizeLeadPhone(phone);

    if (
      normalizedPhone &&
      (existingPhones.has(normalizedPhone) ||
        seenPhones.has(normalizedPhone))
    ) {
      report.rejected += 1;
      report.results.push({
        row: rowNumber,
        status: "REJECTED",
        reason: "Duplicate phone number.",
      });
      continue;
    }

    const tags = String(row.tags || "")
      .split(";")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const input = {
      name: row.name,
      email: row.email || null,
      phone: phone || null,
      interestedIn: row.interestedIn || null,
      sourceId: row.sourceId || null,
      ownerId: row.ownerId || null,
      notes: row.notes || null,
      nextFollowUpAt: row.nextFollowUpAt || null,
      targetBand: row.targetBand || null,
      examDate: row.examDate || null,
      tags,
    };

    const validation = createLeadSchema.safeParse(input);

    if (!validation.success) {
      report.rejected += 1;
      report.results.push({
        row: rowNumber,
        status: "REJECTED",
        reason: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      continue;
    }

    try {
      const lead = await createLead(scope, validation.data);

      if (normalizedPhone) {
        existingPhones.add(normalizedPhone);
        seenPhones.add(normalizedPhone);
      }

      report.imported += 1;
      report.results.push({
        row: rowNumber,
        status: "IMPORTED",
        leadId: lead.id,
      });
    } catch (error) {
      report.rejected += 1;
      report.results.push({
        row: rowNumber,
        status: "REJECTED",
        reason: error.message || "Lead creation failed.",
        code: error.code || "IMPORT_ROW_FAILED",
      });
    }
  }

  return report;
}




module.exports = {
  createLead,
  listLeads,
  getLeadById,
  updateLead,
  softDeleteLead,
  updateLeadStatus,
  getLeadStatusHistory,
  assignLead,
  getLeadAssignmentHistory,
  listAssignableUsers,
  createLeadFollowUp,
  listLeadFollowUps,
  updateLeadFollowUpStatus,
  createLeadActivity,
  listLeadActivities,
  createLeadSource,
  listLeadSources,
  updateLeadSource,
  exportLeadsCsv,
  importLeadsCsv,

};
