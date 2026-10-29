const { z } = require("zod");

const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),

    phone: z
      .string()
      .trim()
      .min(7)
      .max(20)
      .regex(/^[+\d\s().-]+$/, "Please provide a valid phone number.")
      .nullable()
      .optional(),

    avatarUrl: z
      .string()
      .trim()
      .url("Please provide a valid avatar URL.")
      .max(2048)
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    "Provide at least one profile field to update."
  );

module.exports = {
  updateProfileSchema,
};
