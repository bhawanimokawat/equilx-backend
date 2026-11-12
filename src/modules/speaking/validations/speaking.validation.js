
const { z } = require("zod");

const attemptIdParamSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID."),
}).strict();

const submissionIdParamSchema = z.object({
  submissionId: z.string().uuid("Invalid submission ID."),
}).strict();

const recordingIdParamSchema = z.object({
  recordingId: z.string().uuid("Invalid recording ID."),
}).strict();

const submitSpeakingSchema = z.object({
  partNumber: z.number()
    .int()
    .min(1)
    .max(3),
  consentStatus: z.literal("GRANTED"),
}).strict();

const completeSpeakingSchema = z.object({
  transcript: z.string()
    .trim()
    .min(1, "Transcript cannot be empty.")
    .max(30000, "Transcript cannot exceed 30,000 characters."),
}).strict();

const recordingConsentSchema = z.object({
  consentStatus: z.enum(["GRANTED", "DECLINED", "WITHDRAWN"]),
}).strict();

const uploadRecordingSchema = z.object({
  durationSeconds: z.coerce.number()
    .int()
    .min(1)
    .max(900)
    .optional(),
}).strict();

const listSpeakingSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  partNumber: z.coerce.number().int().min(1).max(3).optional(),
  status: z.enum([
    "PENDING",
    "PROCESSING",
    "COMPLETED",
    "FAILED",
    "NEEDS_REVIEW",
  ]).optional(),
}).strict();

module.exports = {
  attemptIdParamSchema,
  submissionIdParamSchema,
  recordingIdParamSchema,
  submitSpeakingSchema,
  completeSpeakingSchema,
  recordingConsentSchema,
  uploadRecordingSchema,
  listSpeakingSubmissionsQuerySchema,
};
