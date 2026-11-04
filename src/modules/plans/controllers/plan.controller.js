const planService = require("../services/plan.service");
const { listPlansSchema, planCodeSchema,} = require("../validation/plan.validation");

const listPlans = async (req, res, next) => {
  try {
    const validation = listPlansSchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid plan filters.",
          details: validation.error.issues,
        },
      });
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

const getPlanByCode = async (req, res, next) => {
  try {
    const validation = planCodeSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid plan code.",
          details: validation.error.issues,
        },
      });
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

module.exports = {
  listPlans,
  getPlanByCode,
};
