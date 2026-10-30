
const { z } = require("zod");

const startAttemptSchema = z.object({
  testVersionId: z.string().uuid("Invalid test version ID."),
  usageType: z.enum(["FULL_MOCK", "PRACTICE"]),
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
