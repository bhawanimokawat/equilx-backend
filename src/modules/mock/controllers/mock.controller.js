const mockService = require("../services/mock.service");
const { listMockTestsQuerySchema,  testIdParamSchema,  testVersionIdParamSchema, attemptIdParamSchema,} = require("../validations/mock.validation");

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

async function listMockTests(req, res) {
  try {
    const query = listMockTestsQuerySchema.parse(req.query);
    const result = await mockService.listMockTests(query);

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

async function getMockTestDetails(req, res) {
  try {
    const { testId } = testIdParamSchema.parse(req.params);
    const result = await mockService.getMockTestDetails(testId);

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

async function startMockAttempt(req, res) {
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

    const result = await mockService.startMockAttempt({
      userId,
      testVersionId,
    });

    return res.status(201).json({
      success: true,
      message: "Mock attempt started successfully.",
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

async function getMockHistory(req, res) {
  try {
    const query = listMockTestsQuerySchema.parse(req.query);

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        code: "UNAUTHORIZED",
      });
    }

    const result = await mockService.getMockHistory({
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

async function getMockHistoryItem(req, res) {
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

    const result = await mockService.getMockHistoryItem({
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
  listMockTests,
  getMockTestDetails,
  startMockAttempt,
  getMockHistory,
  getMockHistoryItem,
};