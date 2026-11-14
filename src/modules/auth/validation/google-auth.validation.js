const { z } = require("zod");

const googleLoginSchema = z.object({
  idToken: z
    .string()
    .min(1, "Google ID token is required.")
    .max(10000, "Google ID token is too large."),
});

module.exports = {
  googleLoginSchema,
};