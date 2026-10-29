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
    // Super Admins can manage memberships across institutes.
    if (req.user?.platformRole === "SUPER_ADMIN") {
      req.membershipScope = { instituteId };
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
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  requireInstituteAdmin,
};
