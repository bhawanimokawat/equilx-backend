const { z } = require("zod");

const listPracticeTestsQuerySchema = z.object({
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

const sectionParamSchema = z.object({
  section: z.enum(
    ["LISTENING", "READING", "WRITING", "SPEAKING"],
    "Invalid IELTS section."
  ),
});

const attemptIdParamSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID."),
});

// Practice must target exactly one module or one part.
const practiceStartBodySchema = z
  .object({
    moduleId: z.string().uuid("Invalid module ID.").optional(),
    partId: z.string().uuid("Invalid part ID.").optional(),
  })
  .strict()
  .refine(
    (data) =>
      (Boolean(data.moduleId) && !data.partId) ||
      (!data.moduleId && Boolean(data.partId)),
    {
      message: "Provide exactly one of moduleId or partId.",
    }
  );


const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
module.exports = {
  listPracticeTestsQuerySchema,
  testIdParamSchema,
  testVersionIdParamSchema,
  sectionParamSchema,
  attemptIdParamSchema,
  practiceStartBodySchema,
  paginationQuerySchema,
};