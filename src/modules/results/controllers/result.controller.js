const {listResultsQuerySchema,attemptIdParamSchema,} = require("../validation/result.validation");
const {listMyResults,getMyResultByAttemptId,} = require("../services/result.service");

async function listResults(req, res, next) {
  try {
    const validation = listResultsQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: validation.error.issues,
      });
    }

    const result = await listMyResults({
      userId: req.user.id,
      ...validation.data,
    });

    return res.status(200).json({
      success: true,
      message: "Results retrieved successfully.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

async function getResultByAttemptId(req, res, next) {
  try {
    const validation = attemptIdParamSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid attempt ID.",
        errors: validation.error.issues,
      });
    }

    const result = await getMyResultByAttemptId({
      userId: req.user.id,
      attemptId: validation.data.attemptId,
    });

    return res.status(200).json({
      success: true,
      message: "Result retrieved successfully.",
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listResults,
  getResultByAttemptId,
};
