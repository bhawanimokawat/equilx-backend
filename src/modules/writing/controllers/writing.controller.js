const writingService = require("../services/writing.service");
const {
  attemptIdParamSchema,
  submissionIdParamSchema,
  submitWritingSchema,
  listWritingSubmissionsQuerySchema,
} = require("../validations/writing.validation");

function validateRequest(schema, data, res) {
  const result = schema.safeParse(data);

  if (!result.success) {
    res.status(400).json({
      success: false,
      message: "Validation failed.",
      errors: result.error.issues,
    });

    return null;
  }

  return result.data;
}

async function submitWriting(req, res, next) {
  try {
    const params = validateRequest(
      attemptIdParamSchema,
      req.params,
      res
    );

    if (!params) return;

    const body = validateRequest(
      submitWritingSchema,
      req.body,
      res
    );

    if (!body) return;

    const result = await writingService.submitWriting({
      userId: req.user.id,
      attemptId: params.attemptId,
      taskNumber: body.taskNumber,
      responseText: body.responseText,
    });

    return res.status(201).json({
      success: true,
      message: "Writing response submitted successfully. AI evaluation is queued.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyWritingSubmissions(req, res, next) {
  try {
    const query = validateRequest(
      listWritingSubmissionsQuerySchema,
      req.query,
      res
    );

    if (!query) return;

    const result = await writingService.getMyWritingSubmissions({
      userId: req.user.id,
      page: query.page,
      limit: query.limit,
      taskNumber: query.taskNumber,
      status: query.status,
    });

    return res.status(200).json({
      success: true,
      message: "Writing submissions retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getWritingSubmissionById(req, res, next) {
  try {
    const params = validateRequest(
      submissionIdParamSchema,
      req.params,
      res
    );

    if (!params) return;

    const result = await writingService.getWritingSubmissionById({
      userId: req.user.id,
      submissionId: params.submissionId,
    });

    return res.status(200).json({
      success: true,
      message: "Writing submission retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitWriting,
  getMyWritingSubmissions,
  getWritingSubmissionById,
};
