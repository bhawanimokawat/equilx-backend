const { z } = require("zod");

const listResultsQuerySchema = z.object({
  page: z.coerce
    .number()
    .int("Page must be an integer.")
    .min(1, "Page must be at least 1.")
    .default(1),

  limit: z.coerce
    .number()
    .int("Limit must be an integer.")
    .min(1, "Limit must be at least 1.")
    .max(50, "Limit cannot exceed 50.")
    .default(10),

  usageType: z
    .enum(["FULL_MOCK", "PRACTICE"])
    .optional(),
});

const attemptIdParamSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID."),
});

module.exports = {
  listResultsQuerySchema,
  attemptIdParamSchema,
};