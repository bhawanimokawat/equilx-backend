const {createOrganizationSchema,updateOrganizationSchema,organizationIdParamSchema,listOrganizationsQuerySchema,} = require("../validation/organization.validation");

const organizationService = require("../services/organization.service");

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
        code: "ORGANIZATION_CONFLICT",
        message: "An organization with this slug already exists.",
      },
    });
  }

  if (error.code === "P2025") {
    return res.status(404).json({
      success: false,
      error: {
        code: "ORGANIZATION_NOT_FOUND",
        message: "The requested organization was not found.",
      },
    });
  }

  return next(error);
}

async function createOrganization(req, res, next) {
  const validation = createOrganizationSchema.safeParse(req.body);

  if (!validation.success) {
    return sendValidationError(res, validation.error);
  }

  try {
    const organization = await organizationService.createOrganization({
      ...validation.data,
      createdById: req.user.id,
    });

    return res.status(201).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    return handleDatabaseError(error, res, next);
  }
}

async function listOrganizations(req, res, next) {
  const validation = listOrganizationsQuerySchema.safeParse(req.query);

  if (!validation.success) {
    return sendValidationError(res, validation.error);
  }

  try {
    const result = await organizationService.listOrganizations(
      validation.data
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getOrganizationById(req, res, next) {
  const validation = organizationIdParamSchema.safeParse(req.params);

  if (!validation.success) {
    return sendValidationError(res, validation.error);
  }

  try {
    const organization = await organizationService.getOrganizationById(
      validation.data.id
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          code: "ORGANIZATION_NOT_FOUND",
          message: "The requested organization was not found.",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    return next(error);
  }
}

async function updateOrganization(req, res, next) {
  const paramsValidation = organizationIdParamSchema.safeParse(req.params);

  if (!paramsValidation.success) {
    return sendValidationError(res, paramsValidation.error);
  }

  const bodyValidation = updateOrganizationSchema.safeParse(req.body);

  if (!bodyValidation.success) {
    return sendValidationError(res, bodyValidation.error);
  }

  try {
    const organization = await organizationService.updateOrganization(
      paramsValidation.data.id,
      bodyValidation.data
    );

    return res.status(200).json({
      success: true,
      data: organization,
    });
  } catch (error) {
    return handleDatabaseError(error, res, next);
  }
}

async function listOrganizationMembers(req, res, next) {
  const paramsValidation = organizationIdParamSchema.safeParse(req.params);

  if (!paramsValidation.success) {
    return sendValidationError(res, paramsValidation.error);
  }

  const queryValidation = listOrganizationsQuerySchema.safeParse(req.query);

  if (!queryValidation.success) {
    return sendValidationError(res, queryValidation.error);
  }

  try {
    const organization = await organizationService.getOrganizationById(
      paramsValidation.data.id
    );

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: {
          code: "ORGANIZATION_NOT_FOUND",
          message: "The requested organization was not found.",
        },
      });
    }

    const result = await organizationService.listOrganizationMembers(
      paramsValidation.data.id,
      queryValidation.data
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createOrganization,
  listOrganizations,
  getOrganizationById,
  updateOrganization,
  listOrganizationMembers,
};
