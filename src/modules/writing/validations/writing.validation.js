
const { z } = require("zod");

const attemptIdParamSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID."),
}).strict();

const submissionIdParamSchema = z.object({
  submissionId: z.string().uuid("Invalid submission ID."),
}).strict();

const submitWritingSchema = z.object({
  taskNumber: z.number().int().min(1).max(2),
  responseText: z
    .string()
    .trim()
    .min(1, "Writing response cannot be empty.")
    .max(30000, "Writing response cannot exceed 30,000 characters."),
}).strict();

const listWritingSubmissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  taskNumber: z.coerce.number().int().min(1).max(2).optional(),
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
  submitWritingSchema,
  listWritingSubmissionsQuerySchema,
};
