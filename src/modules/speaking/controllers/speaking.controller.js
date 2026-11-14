
const speakingService = require("../services/speaking.service");
const recordingService = require("../services/recording.service");

const {
  attemptIdParamSchema,
  submissionIdParamSchema,
  submitSpeakingSchema,
} = require("../validations/speaking.validation");

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

function sendError(res, error) {
  const statusCode = error.statusCode || 500;

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode >= 500
        ? "An unexpected error occurred."
        : error.message,
    code: error.code || "INTERNAL_SERVER_ERROR",
  });
}

async function createSpeakingSubmission(req, res) {
  const params = validateRequest(attemptIdParamSchema, req.params, res);
  if (!params) return;

  const body = validateRequest(submitSpeakingSchema, req.body, res);
  if (!body) return;

  try {
    const submission = await speakingService.createSpeakingSubmission({
      userId: req.user.id,
      attemptId: params.attemptId,
      partNumber: body.partNumber,
      consentStatus: body.consentStatus,
    });

    return res.status(201).json({
      success: true,
      message: "Speaking submission created successfully.",
      data: submission,
    });
  } catch (error) {
    return sendError(res, error);
  }
}


async function uploadSpeakingRecording(req, res) {
  try {
    const params = submissionIdParamSchema.parse(req.params);

    const durationSeconds =
      req.body.durationSeconds !== undefined
        ? Number(req.body.durationSeconds)
        : undefined;

    const result = await recordingService.uploadSpeakingRecording({
      userId: req.user.id,
      submissionId: params.submissionId,
      file: req.file,
      durationSeconds,
    });

    return res.status(result.alreadyExists ? 200 : 201).json({
      success: true,
      message: result.alreadyExists
        ? "This recording was already uploaded successfully."
        : "Speaking recording uploaded successfully.",
      data: {
  ...result.recording,
  fileSizeBytes: result.recording.fileSizeBytes?.toString() ?? null,
},
    });
  } catch (error) {
  console.error("[SPEAKING_RECORDING_UPLOAD_ERROR]", error);
  return sendError(res, error);
}
}

async function completeSpeakingSubmission(req, res) {
  const params = validateRequest(submissionIdParamSchema, req.params, res);
  if (!params) return;

  try {
    const result = await speakingService.completeSpeakingSubmission({
      userId: req.user.id,
      submissionId: params.submissionId,
    });

    return res.status(202).json({
      success: true,
      message: "Speaking transcription has been queued.",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

async function withdrawRecordingConsent(req, res) {
  const params = validateRequest(submissionIdParamSchema, req.params, res);
  if (!params) return;

  try {
    const result = await recordingService.withdrawRecordingConsent({
      userId: req.user.id,
      submissionId: params.submissionId,
    });

    return res.status(200).json({
      success: true,
      message: "Recording consent updated successfully.",
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  createSpeakingSubmission,
  uploadSpeakingRecording,
  completeSpeakingSubmission,
  withdrawRecordingConsent,
};
