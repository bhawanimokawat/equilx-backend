const crypto = require("crypto");
const nodemailer = require("nodemailer");

const { prisma } = require("../../../config/database");

const INVITATION_EXPIRY_DAYS = 7;

function createServiceError(statusCode, code, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function generateInvitationToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashInvitationToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getInvitationExpiry() {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + INVITATION_EXPIRY_DAYS);
  return expiry;
}

function getMailTransporter() {
  const requiredEnv = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASS",
    "SMTP_FROM",
  ];

  const missing = requiredEnv.filter((key) => !process.env[key]);

  if (missing.length) {
    throw createServiceError(
      500,
      "EMAIL_CONFIGURATION_MISSING",
      `Missing email configuration: ${missing.join(", ")}`
    );
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

async function sendStudentInvitationEmail({
  email,
  name,
  instituteName,
  invitationUrl,
  expiresAt,
}) {
  const transporter = getMailTransporter();

  const formattedExpiry = expiresAt.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: `Invitation to join ${instituteName} on Equilx`,
    text: `
Hello ${name || "Student"},

You have been invited to join ${instituteName} on Equilx IELTS.

Accept your invitation using the link below:

${invitationUrl}

This invitation expires on ${formattedExpiry}.

If you were not expecting this invitation, you can ignore this email.

Equilx IELTS Team
    `.trim(),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2>You're invited to join ${instituteName}</h2>
        <p>Hello ${name || "Student"},</p>
        <p>
          You have been invited to join <strong>${instituteName}</strong>
          on Equilx IELTS.
        </p>
        <p>
          <a href="${invitationUrl}"
             style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">
            Accept Invitation
          </a>
        </p>
        <p>This invitation expires on ${formattedExpiry}.</p>
        <p>If you were not expecting this invitation, you can ignore this email.</p>
        <p>Equilx IELTS Team</p>
      </div>
    `,
  });
}

function getInvitationUrl(token) {
  const frontendUrl = process.env.FRONTEND_URL;

  if (!frontendUrl) {
    throw createServiceError(
      500,
      "FRONTEND_URL_MISSING",
      "FRONTEND_URL is not configured."
    );
  }

  return `${frontendUrl.replace(/\/+$/, "")}/accept-invitation?token=${encodeURIComponent(token)}`;
}

async function createOneStudentInvitation({
  instituteId,
  invitedByUserId,
  senderRole,
  student,
  instituteName,
}) {
  const email = student.email.toLowerCase().trim();

  if (!["INSTITUTE_ADMIN", "TRAINER"].includes(senderRole)) {
    throw createServiceError(
      403,
      "INVITATION_NOT_ALLOWED",
      "Only an Institute Admin or Trainer can invite students."
    );
  }

  // Prevent inviting an email that already has an active institute membership.
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      memberships: {
        where: {
          instituteId,
          status: "ACTIVE",
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (existingUser?.memberships?.length) {
    throw createServiceError(
      409,
      "STUDENT_ALREADY_IN_INSTITUTE",
      "This student is already an active member of the institute."
    );
  }

  const now = new Date();

  // Expire an older pending invitation before creating a new one.
  await prisma.membershipInvitation.updateMany({
    where: {
      instituteId,
      inviteeEmail: email,
      status: "PENDING",
      expiresAt: { lte: now },
    },
    data: { status: "EXPIRED" },
  });

  const existingInvitation = await prisma.membershipInvitation.findFirst({
    where: {
      instituteId,
      inviteeEmail: email,
      status: "PENDING",
      expiresAt: { gt: now },
    },
    select: { id: true },
  });

  if (existingInvitation) {
    throw createServiceError(
      409,
      "INVITATION_ALREADY_PENDING",
      "A valid invitation has already been sent to this email address."
    );
  }

  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = getInvitationExpiry();

  const invitation = await prisma.membershipInvitation.create({
    data: {
      instituteId,
      invitedByUserId,
      invitedUserId: null,
      inviteeEmail: email,
      inviteeName: student.name || null,
      inviteePhone: student.phone || null,
      tokenHash,
      approvalRequired: senderRole === "TRAINER",
      status: "PENDING",
      expiresAt,
    },
    select: {
      id: true,
      inviteeEmail: true,
      status: true,
      approvalRequired: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  try {
    const invitationUrl = getInvitationUrl(token);

    await sendStudentInvitationEmail({
      email,
      name: student.name,
      instituteName,
      invitationUrl,
      expiresAt,
    });
  } catch (error) {
    // Do not leave an apparently valid invitation when its email was not sent.
    await prisma.membershipInvitation.deleteMany({
      where: {
        id: invitation.id,
        status: "PENDING",
      },
    });

    throw error;
  }

  return invitation;
}

async function createStudentInvitation({
  instituteId,
  invitedByUserId,
  senderRole,
  student,
}) {
  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { id: true, name: true, status: true },
  });

  if (!institute || institute.status !== "ACTIVE") {
    throw createServiceError(
      404,
      "INSTITUTE_NOT_FOUND",
      "The institute was not found or is not active."
    );
  }

  return createOneStudentInvitation({
    instituteId,
    invitedByUserId,
    senderRole,
    student,
    instituteName: institute.name,
  });
}

async function createBulkStudentInvitations({
  instituteId,
  invitedByUserId,
  senderRole,
  students,
}) {
  if (!Array.isArray(students) || students.length === 0 || students.length > 100) {
    throw createServiceError(
      400,
      "INVALID_STUDENT_LIST",
      "Provide between 1 and 100 students."
    );
  }

  const institute = await prisma.institute.findUnique({
    where: { id: instituteId },
    select: { id: true, name: true, status: true },
  });

  if (!institute || institute.status !== "ACTIVE") {
    throw createServiceError(
      404,
      "INSTITUTE_NOT_FOUND",
      "The institute was not found or is not active."
    );
  }

  const results = [];

  // Process sequentially to avoid SMTP overload and duplicate race conditions
  // within the same bulk request.
  for (const student of students) {
    try {
      const invitation = await createOneStudentInvitation({
        instituteId,
        invitedByUserId,
        senderRole,
        student,
        instituteName: institute.name,
      });

      results.push({
        email: student.email,
        success: true,
        invitation,
      });
    } catch (error) {
      results.push({
        email: student.email,
        success: false,
        error: {
          code: error.code || "INVITATION_FAILED",
          message: error.message || "Unable to send invitation.",
        },
      });
    }
  }

  return {
    total: students.length,
    sent: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
  };
}



async function listStudentInvitations({
  instituteId,
  userId,
  senderRole,
  page = 1,
  limit = 20,
  status,
}) {
  if (!["INSTITUTE_ADMIN", "TRAINER"].includes(senderRole)) {
    throw createServiceError(
      403,
      "INVITATION_ACCESS_DENIED",
      "You are not allowed to view student invitations."
    );
  }

  const where = {
    instituteId,
    ...(senderRole === "TRAINER"
      ? { invitedByUserId: userId }
      : {}),
    ...(status ? { status } : {}),
  };

  const skip = (page - 1) * limit;

  const [invitations, total] = await prisma.$transaction([
    prisma.membershipInvitation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        inviteeEmail: true,
        inviteeName: true,
        inviteePhone: true,
        status: true,
        approvalRequired: true,
        expiresAt: true,
        acceptedAt: true,
        reviewedAt: true,
        createdAt: true,
        invitedBy: {
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
    }),
    prisma.membershipInvitation.count({ where }),
  ]);

  return {
    invitations,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}


async function resendStudentInvitation({
  instituteId,
  invitationId,
  userId,
  senderRole,
}) {
  if (!["INSTITUTE_ADMIN", "TRAINER"].includes(senderRole)) {
    throw createServiceError(
      403,
      "INVITATION_ACCESS_DENIED",
      "You are not allowed to resend invitations."
    );
  }

  const where = {
    id: invitationId,
    instituteId,
    ...(senderRole === "TRAINER" ? { invitedByUserId: userId } : {}),
  };

  const invitation = await prisma.membershipInvitation.findFirst({
    where,
    include: {
      institute: {
        select: { name: true, status: true },
      },
    },
  });

  if (!invitation || invitation.institute.status !== "ACTIVE") {
    throw createServiceError(
      404,
      "INVITATION_NOT_FOUND",
      "Invitation not found."
    );
  }

  if (!["PENDING", "EXPIRED"].includes(invitation.status)) {
    throw createServiceError(
      409,
      "INVITATION_CANNOT_BE_RESENT",
      "Only pending or expired invitations can be resent."
    );
  }

  const token = generateInvitationToken();
  const tokenHash = hashInvitationToken(token);
  const expiresAt = getInvitationExpiry();

  // Update token and expiry before sending. Roll back these fields if email fails.
  const updated = await prisma.membershipInvitation.update({
    where: { id: invitation.id },
    data: {
      tokenHash,
      expiresAt,
      status: "PENDING",
    },
    select: {
      id: true,
      inviteeEmail: true,
      status: true,
      approvalRequired: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  try {
    const invitationUrl = getInvitationUrl(token);

    await sendStudentInvitationEmail({
      email: invitation.inviteeEmail,
      name: invitation.inviteeName,
      instituteName: invitation.institute.name,
      invitationUrl,
      expiresAt,
    });
  } catch (error) {
    // Invalidate the newly generated token if email delivery fails.
    await prisma.membershipInvitation.updateMany({
      where: {
        id: invitation.id,
        tokenHash,
        status: "PENDING",
      },
      data: {
        tokenHash: crypto.randomBytes(32).toString("hex"),
        status: "EXPIRED",
      },
    });

    throw error;
  }

  return updated;
}



async function cancelStudentInvitation({
  instituteId,
  invitationId,
  userId,
  senderRole,
}) {
  if (!["INSTITUTE_ADMIN", "TRAINER"].includes(senderRole)) {
    throw createServiceError(
      403,
      "INVITATION_ACCESS_DENIED",
      "You are not allowed to cancel invitations."
    );
  }

  const where = {
    id: invitationId,
    instituteId,
    status: "PENDING",
    ...(senderRole === "TRAINER"
      ? { invitedByUserId: userId }
      : {}),
  };

  const invitation = await prisma.membershipInvitation.findFirst({
    where: {
      id: invitationId,
      instituteId,
      ...(senderRole === "TRAINER"
        ? { invitedByUserId: userId }
        : {}),
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!invitation) {
    throw createServiceError(
      404,
      "INVITATION_NOT_FOUND",
      "Invitation not found."
    );
  }

  if (invitation.status !== "PENDING") {
    throw createServiceError(
      409,
      "INVITATION_CANNOT_BE_CANCELLED",
      "Only pending invitations can be cancelled."
    );
  }

  const result = await prisma.membershipInvitation.updateMany({
    where,
    data: {
      status: "CANCELLED",
      tokenHash: crypto.randomBytes(32).toString("hex"),
    },
  });

  if (result.count !== 1) {
    throw createServiceError(
      409,
      "INVITATION_STATUS_CHANGED",
      "The invitation status changed. Please refresh and try again."
    );
  }

  return prisma.membershipInvitation.findUnique({
    where: { id: invitationId },
    select: {
      id: true,
      inviteeEmail: true,
      status: true,
      approvalRequired: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}


async function acceptStudentInvitation({
  token,
  userId,
  userEmail,
}) {
  if (!token || !userId || !userEmail) {
    throw createServiceError(
      400,
      "INVALID_ACCEPTANCE_DETAILS",
      "Valid invitation and authenticated user details are required."
    );
  }

  const tokenHash = hashInvitationToken(token);
  const normalizedEmail = userEmail.toLowerCase().trim();

  const result = await prisma.$transaction(async (tx) => {
    const invitation = await tx.membershipInvitation.findUnique({
      where: { tokenHash },
      include: {
        institute: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!invitation) {
      throw createServiceError(
        404,
        "INVITATION_NOT_FOUND",
        "Invalid invitation link."
      );
    }

    if (invitation.status !== "PENDING") {
      throw createServiceError(
        409,
        "INVITATION_NOT_PENDING",
        "This invitation is no longer available."
      );
    }

    if (invitation.expiresAt <= new Date()) {
      await tx.membershipInvitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });

      return { expired: true };
    }

    if (invitation.institute.status !== "ACTIVE") {
      throw createServiceError(
        404,
        "INSTITUTE_NOT_FOUND",
        "The institute is not available."
      );
    }

    if (invitation.inviteeEmail.toLowerCase() !== normalizedEmail) {
      throw createServiceError(
        403,
        "INVITATION_EMAIL_MISMATCH",
        "This invitation belongs to a different email address."
      );
    }

    const existingMembership = await tx.instituteMembership.findFirst({
      where: {
        instituteId: invitation.instituteId,
        userId,
      },
      select: { id: true },
    });

    if (existingMembership) {
      throw createServiceError(
        409,
        "MEMBERSHIP_ALREADY_EXISTS",
        "You already have a membership record for this institute."
      );
    }

    const now = new Date();

    const approvalRequired = invitation.approvalRequired;

    const membership = await tx.instituteMembership.create({
      data: {
        instituteId: invitation.instituteId,
        userId,
        role: "INSTITUTE_STUDENT",
        status: approvalRequired ? "PENDING_APPROVAL" : "ACTIVE",
        joinedAt: approvalRequired ? null : now,
      },
      select: {
        id: true,
        instituteId: true,
        userId: true,
        role: true,
        status: true,
        joinedAt: true,
        createdAt: true,
      },
    });

    const updatedInvitation = await tx.membershipInvitation.updateMany({
      where: {
        id: invitation.id,
        tokenHash,
        status: "PENDING",
        expiresAt: { gt: now },
      },
      data: {
        invitedUserId: userId,
        acceptedAt: now,
        status: approvalRequired
          ? "ACCEPTED_PENDING_APPROVAL"
          : "APPROVED",
      },
    });

    if (updatedInvitation.count !== 1) {
      throw createServiceError(
        409,
        "INVITATION_ALREADY_PROCESSED",
        "This invitation has already been processed."
      );
    }

    return {
      expired: false,
      approvalRequired,
      membership,
    };
  });

  if (result.expired) {
    throw createServiceError(
      410,
      "INVITATION_EXPIRED",
      "This invitation has expired. Please request a new invitation."
    );
  }

  return {
    membership: result.membership,
    status: result.approvalRequired
      ? "PENDING_APPROVAL"
      : "ACTIVE",
    message: result.approvalRequired
      ? "Invitation accepted. Waiting for Institute Admin approval."
      : "Invitation accepted. You have joined the institute.",
  };
}


async function approveStudentInvitation({
  instituteId,
  invitationId,
  adminUserId,
}) {
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.membershipInvitation.findFirst({
      where: {
        id: invitationId,
        instituteId,
        status: "ACCEPTED_PENDING_APPROVAL",
        approvalRequired: true,
      },
      select: {
        id: true,
        invitedUserId: true,
        inviteeEmail: true,
        institute: {
          select: { status: true },
        },
      },
    });

    if (!invitation || !invitation.invitedUserId) {
      throw createServiceError(
        404,
        "PENDING_INVITATION_NOT_FOUND",
        "No accepted invitation awaiting approval was found."
      );
    }

    if (invitation.institute.status !== "ACTIVE") {
      throw createServiceError(
        404,
        "INSTITUTE_NOT_FOUND",
        "The institute is not active."
      );
    }

    const now = new Date();

    const membershipUpdate = await tx.instituteMembership.updateMany({
      where: {
        instituteId,
        userId: invitation.invitedUserId,
        role: "INSTITUTE_STUDENT",
        status: "PENDING_APPROVAL",
      },
      data: {
        status: "ACTIVE",
        joinedAt: now,
      },
    });

    if (membershipUpdate.count !== 1) {
      throw createServiceError(
        409,
        "PENDING_MEMBERSHIP_NOT_FOUND",
        "The student's pending membership could not be found."
      );
    }

    const invitationUpdate = await tx.membershipInvitation.updateMany({
      where: {
        id: invitation.id,
        instituteId,
        status: "ACCEPTED_PENDING_APPROVAL",
      },
      data: {
        status: "APPROVED",
        reviewedById: adminUserId,
        reviewedAt: now,
      },
    });

    if (invitationUpdate.count !== 1) {
      throw createServiceError(
        409,
        "INVITATION_STATUS_CHANGED",
        "The invitation was already processed. Please refresh."
      );
    }

    return {
      invitationId: invitation.id,
      studentEmail: invitation.inviteeEmail,
      membershipStatus: "ACTIVE",
      invitationStatus: "APPROVED",
      reviewedAt: now,
    };
  });
}


async function rejectStudentInvitation({
  instituteId,
  invitationId,
  adminUserId,
}) {
  return prisma.$transaction(async (tx) => {
    const invitation = await tx.membershipInvitation.findFirst({
      where: {
        id: invitationId,
        instituteId,
        status: "ACCEPTED_PENDING_APPROVAL",
        approvalRequired: true,
      },
      select: {
        id: true,
        invitedUserId: true,
        inviteeEmail: true,
        institute: {
          select: { status: true },
        },
      },
    });

    if (!invitation || !invitation.invitedUserId) {
      throw createServiceError(
        404,
        "PENDING_INVITATION_NOT_FOUND",
        "No accepted invitation awaiting approval was found."
      );
    }

    if (invitation.institute.status !== "ACTIVE") {
      throw createServiceError(
        404,
        "INSTITUTE_NOT_FOUND",
        "The institute is not active."
      );
    }

    const now = new Date();

    const membershipUpdate = await tx.instituteMembership.updateMany({
      where: {
        instituteId,
        userId: invitation.invitedUserId,
        role: "INSTITUTE_STUDENT",
        status: "PENDING_APPROVAL",
      },
      data: {
        status: "REVOKED",
      },
    });

    if (membershipUpdate.count !== 1) {
      throw createServiceError(
        409,
        "PENDING_MEMBERSHIP_NOT_FOUND",
        "The student's pending membership could not be found."
      );
    }

    const invitationUpdate = await tx.membershipInvitation.updateMany({
      where: {
        id: invitation.id,
        instituteId,
        status: "ACCEPTED_PENDING_APPROVAL",
      },
      data: {
        status: "REJECTED",
        reviewedById: adminUserId,
        reviewedAt: now,
      },
    });

    if (invitationUpdate.count !== 1) {
      throw createServiceError(
        409,
        "INVITATION_STATUS_CHANGED",
        "The invitation was already processed. Please refresh."
      );
    }

    return {
      invitationId: invitation.id,
      studentEmail: invitation.inviteeEmail,
      membershipStatus: "REVOKED",
      invitationStatus: "REJECTED",
      reviewedAt: now,
    };
  });
}


module.exports = {
  createStudentInvitation,
  createBulkStudentInvitations,
  listStudentInvitations,
  resendStudentInvitation,
  cancelStudentInvitation,
  acceptStudentInvitation,
  approveStudentInvitation,
  rejectStudentInvitation,
};