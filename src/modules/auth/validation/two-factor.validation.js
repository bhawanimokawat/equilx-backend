
const { z } = require("zod");

const verifyLoginOtpSchema = z.object({
  challengeId: z.string().uuid("Invalid login challenge ID."),
  otp: z.string().regex(/^\d{6}$/, "OTP must contain exactly 6 digits."),
}).strict();

module.exports = {
  verifyLoginOtpSchema,
};
