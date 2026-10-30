const { z } = require("zod");

const listMockTestsQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer.")
    .min(1, "Page must be a positive integer.")
    .default(1),

  limit: z.coerce
    .number()
    .int("Limit must be an integer.")
    .min(1, "Limit must be at least 1.")
    .max(50, "Limit cannot exceed 50.")
    .default(10),

  category: z
    .enum(["ACADEMIC", "GENERAL_TRAINING"])
    .optional(),
});

const testIdParamSchema = z.object({
  testId: z.string().uuid("Invalid test ID."),
});

const testVersionIdParamSchema = z.object({
  testVersionId: z.string().uuid("Invalid test version ID."),
});

const attemptIdParamSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID."),
});

module.exports = {
  listMockTestsQuerySchema,
  testIdParamSchema,
  testVersionIdParamSchema,
  attemptIdParamSchema,
};
