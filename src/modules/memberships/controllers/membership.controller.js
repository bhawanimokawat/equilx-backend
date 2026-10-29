const {
  membershipRouteParamsSchema,
  createMembershipSchema,
  updateMembershipSchema,
  listMembershipsQuerySchema,
} = require("../validation/membership.validation");
const membershipService = require("../services/membership.service");

function sendValidationError(res, error) {
  return res.status(400).json({
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Please check the submitted data.",
      details: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    },
  });
}

function handleDatabaseError(error, res, next) {
  if (error.code === "P2002") {
    return res.status(409).json({
      success: false,
      error: {
        code: "MEMBERSHIP_CONFLICT",
        message: "This user already has a membership in the institute.",
      },
    });
  }

  if (error.code === "P2003") {
    return res.status(400).json({
      success: false,
      error: {
        code: "INVALID_REFERENCE",
        message: "The specified user or institute does not exist.",
      },
    });
  }

  return next(error);
}


async function createMembership(req, res, next) {
  const validation = createMembershipSchema.safeParse(req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error);
  }

  const instituteId = req.membershipScope?.instituteId;

  if (!instituteId) {
    return res.status(403).json({
      success: false,
      error: {
        code: "INSTITUTE_SCOPE_REQUIRED",
        message: "An authorized institute context is required.",
      },
    });
  }

  // Prevent Institute Admins from granting privileged roles.
  if (
    req.user?.platformRole !== "SUPER_ADMIN" &&
    validation.data.role === "INSTITUTE_ADMIN"
  ) {
    return res.status(403).json({
      success: false,
      error: {
        code: "ROLE_ASSIGNMENT_DENIED",
        message: "Only a Super Admin can assign the Institute Admin role.",
      },
    });
  }

  try {
    const membership = await membershipService.createMembership({
      ...validation.data,
      instituteId,
    });

    return res.status(201).json({
      success: true,
      data: membership,
    });
  } catch (error) {
    return handleDatabaseError(error, res, next);
  }
}


async function listMemberships(req, res, next) {
  const validation = listMembershipsQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return sendValidationError(res, validation.error);
  }

  // Never accept the institute scope from query parameters.
  // The authorized route will supply it from verified membership context.
  const instituteId = req.membershipScope?.instituteId;

  if (!instituteId) {
    return res.status(403).json({
      success: false,
      error: {
        code: "INSTITUTE_SCOPE_REQUIRED",
        message: "An authorized institute context is required.",
      },
    });
  }

  try {
    const result = await membershipService.listMemberships({
      instituteId,
      ...validation.data,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getMembershipById(req, res, next) {
const paramsValidation =
  membershipRouteParamsSchema.safeParse(req.params);

  if (!paramsValidation.success) {
    return sendValidationError(res, paramsValidation.error);
  }

  const instituteId = req.membershipScope?.instituteId;

  if (!instituteId) {
    return res.status(403).json({
      success: false,
      error: {
        code: "INSTITUTE_SCOPE_REQUIRED",
        message: "An authorized institute context is required.",
      },
    });
  }

  try {
    const membership = await membershipService.getMembershipById(
      paramsValidation.data.id,
      instituteId
    );

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: {
          code: "MEMBERSHIP_NOT_FOUND",
          message: "The requested membership was not found.",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: membership,
    });
  } catch (error) {
    return next(error);
  }
}


async function updateMembership(req, res, next) {
  const paramsValidation = membershipRouteParamsSchema.safeParse(
    req.params
  );

  if (!paramsValidation.success) {
    return sendValidationError(res, paramsValidation.error);
  }

  const bodyValidation = updateMembershipSchema.safeParse(req.body);

  if (!bodyValidation.success) {
    return sendValidationError(res, bodyValidation.error);
  }

  const instituteId = req.membershipScope?.instituteId;

  if (!instituteId) {
    return res.status(403).json({
      success: false,
      error: {
        code: "INSTITUTE_SCOPE_REQUIRED",
        message: "An authorized institute context is required.",
      },
    });
  }

  // Only Super Admins can assign the Institute Admin role.
  if (
    req.user?.platformRole !== "SUPER_ADMIN" &&
    bodyValidation.data.role === "INSTITUTE_ADMIN"
  ) {
    return res.status(403).json({
      success: false,
      error: {
        code: "ROLE_ASSIGNMENT_DENIED",
        message:
          "Only a Super Admin can assign the Institute Admin role.",
      },
    });
  }

  try {
    const membership = await membershipService.updateMembership(
      paramsValidation.data.id,
      instituteId,
      bodyValidation.data
    );

    if (!membership) {
      return res.status(404).json({
        success: false,
        error: {
          code: "MEMBERSHIP_NOT_FOUND",
          message: "The requested membership was not found.",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: membership,
    });
  } catch (error) {
    return handleDatabaseError(error, res, next);
  }
}


module.exports = {
  createMembership,
  listMemberships,
  getMembershipById,
  updateMembership,
};
