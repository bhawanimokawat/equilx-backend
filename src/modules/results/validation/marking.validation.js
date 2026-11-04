
const { z } = require("zod");

// Currently supported objective marking rule.
// IELTS Listening and Reading questions must award exactly one mark.
const exactMatchRuleSchema = z.object({
  type: z.literal("EXACT_MATCH"),
  caseSensitive: z.boolean().default(false),
  trimWhitespace: z.boolean().default(true),
  marks: z.literal(1).default(1),
});

// Accepted answers must be strings or numbers.
const acceptedAnswersSchema = z
  .array(z.union([z.string(), z.number()]))
  .min(1);

// Add new rule schemas here as question formats are implemented.
const markingRuleSchema = z.discriminatedUnion("type", [
  exactMatchRuleSchema,
]);

module.exports = {
  markingRuleSchema,
  acceptedAnswersSchema,
};
