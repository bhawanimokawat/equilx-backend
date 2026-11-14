const { createStudentInvitation, createBulkStudentInvitations,listStudentInvitations,resendStudentInvitation,cancelStudentInvitation,acceptStudentInvitation,approveStudentInvitation,rejectStudentInvitation} = require("../services/student-invitation.service");
const {
  createStudentInvitationSchema,
  createBulkStudentInvitationsSchema,  listStudentInvitationsSchema,invitationIdSchema,acceptStudentInvitationSchema
} = require("../validation/student-invitation.validation");

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({
    success: false,
    error: {
      code: error.code || "INTERNAL_SERVER_ERROR",
      message:
        error.statusCode && error.statusCode < 500
          ? error.message
          : "Something went wrong while processing the invitation.",
    },
  });
}

// POST /:instituteId/student-invitations
async function createInvitation(req, res, next) {
  try {
    const validation = createStudentInvitationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid student invitation details.",
          details: validation.error.issues,
        },
      });
    }

    const invitation = await createStudentInvitation({
      instituteId: req.membershipScope.instituteId,
      invitedByUserId: req.user.id,
      senderRole: req.membershipScope.role,
      student: validation.data,
    });

    return res.status(201).json({
      success: true,
      message: "Student invitation sent successfully.",
      data: invitation,
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error);
    }

    return next(error);
  }
}

// POST /:instituteId/student-invitations/bulk
async function createBulkInvitations(req, res, next) {
  try {
    const validation =
      createBulkStudentInvitationsSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid bulk student invitation details.",
          details: validation.error.issues,
        },
      });
    }

    const result = await createBulkStudentInvitations({
      instituteId: req.membershipScope.instituteId,
      invitedByUserId: req.user.id,
      senderRole: req.membershipScope.role,
      students: validation.data.students,
    });

    return res.status(200).json({
      success: true,
      message: "Bulk student invitation process completed.",
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error);
    }

    return next(error);
  }
}


// GET /:instituteId/student-invitations
async function listInvitations(req, res, next) {
  try {
    const validation = listStudentInvitationsSchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid invitation listing parameters.",
          details: validation.error.issues,
        },
      });
    }

    const result = await listStudentInvitations({
      instituteId: req.membershipScope.instituteId,
      userId: req.user.id,
      senderRole: req.membershipScope.role,
      page: validation.data.page,
      limit: validation.data.limit,
      status: validation.data.status,
    });

    return res.status(200).json({
      success: true,
      message: "Student invitations retrieved successfully.",
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error);
    }

    return next(error);
  }
}



async function resendInvitation(req, res, next) {
  try {
    const validation = invitationIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "A valid invitation ID is required.",
          details: validation.error.issues,
        },
      });
    }

    const invitation = await resendStudentInvitation({
      instituteId: req.membershipScope.instituteId,
      invitationId: validation.data.id,
      userId: req.user.id,
      senderRole: req.membershipScope.role,
    });

    return res.status(200).json({
      success: true,
      message: "Student invitation resent successfully.",
      data: invitation,
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error);
    }

    return next(error);
  }
}



async function cancelInvitation(req, res, next) {
  try {
    const validation = invitationIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "A valid invitation ID is required.",
          details: validation.error.issues,
        },
      });
    }

    const invitation = await cancelStudentInvitation({
      instituteId: req.membershipScope.instituteId,
      invitationId: validation.data.id,
      userId: req.user.id,
      senderRole: req.membershipScope.role,
    });

    return res.status(200).json({
      success: true,
      message: "Student invitation cancelled successfully.",
      data: invitation,
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error);
    }

    return next(error);
  }
}


async function acceptInvitation(req, res, next) {
  try {
    if (!req.user?.emailVerifiedAt) {
      return res.status(403).json({
        success: false,
        error: {
          code: "EMAIL_VERIFICATION_REQUIRED",
          message: "Please verify your email before accepting an invitation.",
        },
      });
    }

    const validation = acceptStudentInvitationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "A valid invitation token is required.",
          details: validation.error.issues,
        },
      });
    }

    const result = await acceptStudentInvitation({
      token: validation.data.token,
      userId: req.user.id,
      userEmail: req.user.email,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    if (error.statusCode) {
      return sendError(res, error);
    }

    return next(error);
  }
}

async function approveInvitation(req, res) {
  try {
    const validation = invitationIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation ID.",
        errors: validation.error.flatten(),
      });
    }

    const result = await approveStudentInvitation({
      instituteId: req.membershipScope.instituteId,
      invitationId: validation.data.id,
      adminUserId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Student invitation approved successfully.",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function rejectInvitation(req, res) {
  try {
    const validation = invitationIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid invitation ID.",
        errors: validation.error.flatten(),
      });
    }

    const result = await rejectStudentInvitation({
      instituteId: req.membershipScope.instituteId,
      invitationId: validation.data.id,
      adminUserId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Student invitation rejected successfully.",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
}



module.exports = {
  createInvitation,
  createBulkInvitations,
  listInvitations,
  resendInvitation,
  cancelInvitation,
  acceptInvitation,
  approveInvitation,
  rejectInvitation,
};
