
const { z } = require("zod");
const { prisma } = require("../../../config/database");

const instituteIdSchema = z.string().uuid();

async function requireInstituteAdmin(req, res, next) {
  const instituteIdResult = instituteIdSchema.safeParse(
    req.params.instituteId
  );

  if (!instituteIdResult.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_INSTITUTE_ID",
        message: "A valid institute ID is required.",
      },
    });
  }

  const instituteId = instituteIdResult.data;

  try {
    if (req.user?.platformRole === "SUPER_ADMIN") {
      req.membershipScope = {
        instituteId,
        role: "SUPER_ADMIN",
      };
      return next();
    }

    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required.",
        },
      });
    }

    const membership = await prisma.instituteMembership.findFirst({
      where: {
        instituteId,
        userId: req.user.id,
        role: "INSTITUTE_ADMIN",
        status: "ACTIVE",
        institute: {
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
        instituteId: true,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: {
          code: "INSTITUTE_ACCESS_DENIED",
          message: "You cannot manage memberships for this institute.",
        },
      });
    }

    req.membershipScope = {
      instituteId: membership.instituteId,
      membershipId: membership.id,
      role: "INSTITUTE_ADMIN",
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

// Only active Institute Admins and Trainers can manage student invitations.
async function requireStudentInvitationAccess(req, res, next) {
  const instituteIdResult = instituteIdSchema.safeParse(
    req.params.instituteId
  );

  if (!instituteIdResult.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_INSTITUTE_ID",
        message: "A valid institute ID is required.",
      },
    });
  }

  const instituteId = instituteIdResult.data;

  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHENTICATED",
          message: "Authentication is required.",
        },
      });
    }

    const membership = await prisma.instituteMembership.findFirst({
      where: {
        instituteId,
        userId: req.user.id,
        role: {
          in: ["INSTITUTE_ADMIN", "TRAINER"],
        },
        status: "ACTIVE",
        institute: {
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
        instituteId: true,
        role: true,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: {
          code: "INSTITUTE_ACCESS_DENIED",
          message: "You cannot manage student invitations for this institute.",
        },
      });
    }

    req.membershipScope = {
      instituteId: membership.instituteId,
      membershipId: membership.id,
      role: membership.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}


async function requireInstituteAdminOnly(req, res, next) {
  const instituteIdResult = instituteIdSchema.safeParse(
    req.params.instituteId
  );

  if (!instituteIdResult.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_INSTITUTE_ID",
        message: "A valid institute ID is required.",
      },
    });
  }

  try {
    if (!req.user?.id || req.user.platformRole === "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        error: {
          code: "INSTITUTE_ADMIN_ONLY",
          message: "Only an active Institute Admin can perform this action.",
        },
      });
    }

    const membership = await prisma.instituteMembership.findFirst({
      where: {
        instituteId: instituteIdResult.data,
        userId: req.user.id,
        role: "INSTITUTE_ADMIN",
        status: "ACTIVE",
        institute: {
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
        instituteId: true,
        role: true,
      },
    });

    if (!membership) {
      return res.status(403).json({
        success: false,
        error: {
          code: "INSTITUTE_ADMIN_ONLY",
          message: "Only an active Institute Admin can perform this action.",
        },
      });
    }

    req.membershipScope = {
      instituteId: membership.instituteId,
      membershipId: membership.id,
      role: membership.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireInstituteAdmin,
  requireStudentInvitationAccess,
  requireInstituteAdminOnly,
};
