
const { z } = require("zod");

const startAttemptSchema = z
  .object({
    testVersionId: z.string().uuid("Invalid test version ID."),

    usageType: z.enum(["FULL_MOCK", "PRACTICE"]),

    moduleId: z.string().uuid("Invalid module ID.").optional(),

    partId: z.string().uuid("Invalid part ID.").optional(),
  })
  .superRefine((data, ctx) => {
    const hasModule = Boolean(data.moduleId);
    const hasPart = Boolean(data.partId);

    if (data.usageType === "FULL_MOCK" && (hasModule || hasPart)) {
      ctx.addIssue({
        code: "custom",
        message: "Full mock attempts cannot have a module or part selection.",
        path: ["moduleId"],
      });
    }

    if (
      data.usageType === "PRACTICE" &&
      hasModule === hasPart
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Practice attempts require exactly one module or part.",
        path: ["moduleId"],
      });
    }
  });
const attemptIdParamSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID."),
});

const questionIdParamSchema = z.object({
  attemptId: z.string().uuid("Invalid attempt ID."),
  questionId: z.string().uuid("Invalid question ID."),
});

const saveAnswerSchema = z
  .object({
    answer: z.unknown(),
  })
  .refine(
    (data) =>
      Object.prototype.hasOwnProperty.call(data, "answer"),
    {
      message: "Answer is required.",
      path: ["answer"],
    }
  );

module.exports = {
  startAttemptSchema,
  attemptIdParamSchema,
  questionIdParamSchema,
  saveAnswerSchema,
};
