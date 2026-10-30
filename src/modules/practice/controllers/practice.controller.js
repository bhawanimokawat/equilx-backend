const practiceService = require("../services/practice.service");
const { listPracticeTestsQuerySchema, testIdParamSchema, testVersionIdParamSchema, attemptIdParamSchema,} = require("../validation/practice.validation");

function sendError(res, error) {
  return res.status(error.statusCode || 500).json({
    success: false,
    message:
      error.statusCode && error.statusCode < 500
        ? error.message
        : "An unexpected error occurred.",
    code: error.code || "INTERNAL_SERVER_ERROR",
  });
}

async function listPracticeTests(req, res) {
  try {
    const query = listPracticeTestsQuerySchema.parse(req.query);

    const result = await practiceService.listPracticeTests(query);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: error.issues,
      });
    }

    return sendError(res, error);
  }
}

async function getPracticeTestDetails(req, res) {
  try {
    const { testId } = testIdParamSchema.parse(req.params);

    const result = await practiceService.getPracticeTestDetails(testId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid test ID.",
        errors: error.issues,
      });
    }

    return sendError(res, error);
  }
}

async function startPracticeAttempt(req, res) {
  try {
    const { testVersionId } = testVersionIdParamSchema.parse(req.params);

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        code: "UNAUTHORIZED",
      });
    }

    const result = await practiceService.startPracticeAttempt({
      userId,
      testVersionId,
    });

    return res.status(201).json({
      success: true,
      message: "Practice attempt started successfully.",
      data: result,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid test version ID.",
        errors: error.issues,
      });
    }

    return sendError(res, error);
  }
}

async function getPracticeHistory(req, res) {
  try {
    const query = listPracticeTestsQuerySchema.parse(req.query);

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        code: "UNAUTHORIZED",
      });
    }

    const result = await practiceService.getPracticeHistory({
      userId,
      page: query.page,
      limit: query.limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid query parameters.",
        errors: error.issues,
      });
    }

    return sendError(res, error);
  }
}

async function getPracticeHistoryItem(req, res) {
  try {
    const { attemptId } = attemptIdParamSchema.parse(req.params);

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        code: "UNAUTHORIZED",
      });
    }

    const result = await practiceService.getPracticeHistoryItem({
      userId,
      attemptId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        success: false,
        message: "Invalid attempt ID.",
        errors: error.issues,
      });
    }

    return sendError(res, error);
  }
}

module.exports = {
  listPracticeTests,
  getPracticeTestDetails,
  startPracticeAttempt,
  getPracticeHistory,
  getPracticeHistoryItem,
};