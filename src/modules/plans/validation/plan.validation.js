const { z } = require("zod");

const ownerTypeSchema = z.enum(["INDIVIDUAL", "INSTITUTE"]);

const listPlansSchema = z.object({
  ownerType: ownerTypeSchema.optional(),
});

const planCodeSchema = z.object({
  code: z.enum([
    "FREE",
    "STUDENT_PRO",
    "INSTITUTE_6_MONTH",
    "INSTITUTE_12_MONTH",
  ]),
});

module.exports = {
  listPlansSchema,
  planCodeSchema,
};
