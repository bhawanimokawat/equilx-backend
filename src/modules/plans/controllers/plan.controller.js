
const planService = require("../services/plan.service");

const {
  listPlansSchema,
  planCodeSchema,
  planIdParamSchema,
  listAdminPlansSchema,
  createPlanSchema,
  updatePlanSchema,
  updatePlanStatusSchema,
  createPlanVersionSchema,
} = require("../validation/plan.validation");

// --------------------------------------------------
// Shared error response
// --------------------------------------------------

const sendValidationError = (res, message, details) => {
  return res.status(400).json({
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message,
      details,
    },
  });
};

// --------------------------------------------------
// Public: List active plans
// GET /api/v1/plans
// --------------------------------------------------

const listPlans = async (req, res, next) => {
  try {
    const validation = listPlansSchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(
        res,
        "Invalid plan filters.",
        validation.error.issues
      );
    }

    const plans = await planService.listPlans(validation.data);

    return res.status(200).json({
      success: true,
      message: "Plans retrieved successfully.",
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// Public: Get plan by code
// GET /api/v1/plans/:code
// --------------------------------------------------

const getPlanByCode = async (req, res, next) => {
  try {
    const validation = planCodeSchema.safeParse(req.params);

    if (!validation.success) {
      return sendValidationError(
        res,
        "Invalid plan code.",
        validation.error.issues
      );
    }

    const plan = await planService.getPlanByCode(
      validation.data.code
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PLAN_NOT_FOUND",
          message: "The requested plan was not found.",
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan retrieved successfully.",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// Admin: List all plans
// GET /api/v1/plans/admin
// --------------------------------------------------

const listAdminPlans = async (req, res, next) => {
  try {
    const validation = listAdminPlansSchema.safeParse(req.query);

    if (!validation.success) {
      return sendValidationError(
        res,
        "Invalid admin plan filters.",
        validation.error.issues
      );
    }

    const plans = await planService.listAdminPlans(
      validation.data
    );

    return res.status(200).json({
      success: true,
      message: "Admin plans retrieved successfully.",
      data: plans,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// Admin: Get plan by ID
// GET /api/v1/plans/admin/:planId
// --------------------------------------------------

const getAdminPlanById = async (req, res, next) => {
  try {
    const validation = planIdParamSchema.safeParse(req.params);

    if (!validation.success) {
      return sendValidationError(
        res,
        "Invalid plan ID.",
        validation.error.issues
      );
    }

    const plan = await planService.getAdminPlanById(
      validation.data.planId
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PLAN_NOT_FOUND",
          message: "The requested plan was not found.",
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Plan retrieved successfully.",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// Admin: Create plan
// POST /api/v1/plans/admin
// --------------------------------------------------

const createPlan = async (req, res, next) => {
  try {
    const validation = createPlanSchema.safeParse(req.body);

    if (!validation.success) {
      return sendValidationError(
        res,
        "Invalid plan data.",
        validation.error.issues
      );
    }

    const plan = await planService.createPlan(validation.data);

    return res.status(201).json({
      success: true,
      message: "Plan created successfully.",
      data: plan,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: {
          code: "PLAN_ALREADY_EXISTS",
          message: "A plan with this code already exists.",
        },
      });
    }

    next(error);
  }
};

// --------------------------------------------------
// Admin: Update plan metadata
// PATCH /api/v1/plans/admin/:planId
// --------------------------------------------------

const updatePlan = async (req, res, next) => {
  try {
    const paramsValidation = planIdParamSchema.safeParse(
      req.params
    );

    if (!paramsValidation.success) {
      return sendValidationError(
        res,
        "Invalid plan ID.",
        paramsValidation.error.issues
      );
    }

    const bodyValidation = updatePlanSchema.safeParse(req.body);

    if (!bodyValidation.success) {
      return sendValidationError(
        res,
        "Invalid plan update data.",
        bodyValidation.error.issues
      );
    }

    const existingPlan = await planService.getAdminPlanById(
      paramsValidation.data.planId
    );

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PLAN_NOT_FOUND",
          message: "The requested plan was not found.",
        },
      });
    }

    const plan = await planService.updatePlan(
      paramsValidation.data.planId,
      bodyValidation.data
    );

    return res.status(200).json({
      success: true,
      message: "Plan updated successfully.",
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// Admin: Activate / deactivate plan
// PATCH /api/v1/plans/admin/:planId/status
// --------------------------------------------------

const updatePlanStatus = async (req, res, next) => {
  try {
    const paramsValidation = planIdParamSchema.safeParse(
      req.params
    );

    if (!paramsValidation.success) {
      return sendValidationError(
        res,
        "Invalid plan ID.",
        paramsValidation.error.issues
      );
    }

    const bodyValidation = updatePlanStatusSchema.safeParse(
      req.body
    );

    if (!bodyValidation.success) {
      return sendValidationError(
        res,
        "Invalid plan status.",
        bodyValidation.error.issues
      );
    }

    const existingPlan = await planService.getAdminPlanById(
      paramsValidation.data.planId
    );

    if (!existingPlan) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PLAN_NOT_FOUND",
          message: "The requested plan was not found.",
        },
      });
    }

    const plan = await planService.updatePlanStatus(
      paramsValidation.data.planId,
      bodyValidation.data.isActive
    );

    return res.status(200).json({
      success: true,
      message: `Plan ${plan.isActive ? "activated" : "deactivated"} successfully.`,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
};

// --------------------------------------------------
// Admin: Create new pricing version
// POST /api/v1/plans/admin/:planId/versions
// --------------------------------------------------

const createPlanVersion = async (req, res, next) => {
  try {
    const paramsValidation = planIdParamSchema.safeParse(
      req.params
    );

    if (!paramsValidation.success) {
      return sendValidationError(
        res,
        "Invalid plan ID.",
        paramsValidation.error.issues
      );
    }

    const bodyValidation = createPlanVersionSchema.safeParse(
      req.body
    );

    if (!bodyValidation.success) {
      return sendValidationError(
        res,
        "Invalid plan version data.",
        bodyValidation.error.issues
      );
    }

    const plan = await planService.getAdminPlanById(
      paramsValidation.data.planId
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PLAN_NOT_FOUND",
          message: "The requested plan was not found.",
        },
      });
    }

    const version = await planService.createPlanVersion(
      paramsValidation.data.planId,
      bodyValidation.data
    );

    return res.status(201).json({
      success: true,
      message: "Plan version created successfully.",
      data: version,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: {
          code: "PLAN_VERSION_CONFLICT",
          message: "A conflicting plan version already exists.",
        },
      });
    }

    next(error);
  }
};

// --------------------------------------------------
// Exports
// --------------------------------------------------

module.exports = {
  // Public
  listPlans,
  getPlanByCode,

  // Admin
  listAdminPlans,
  getAdminPlanById,
  createPlan,
  updatePlan,
  updatePlanStatus,
  createPlanVersion,
};
