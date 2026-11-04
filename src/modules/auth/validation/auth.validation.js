const { z } = require("zod");

const emailSchema = z
  .string()
  .trim()
  .email()
  .max(254)
  .transform((value) => value.toLowerCase());

const passwordSchema = z
  .string()
  .min(12, "Password must contain at least 8 characters")
  .max(128, "Password must not exceed 128 characters");


const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: emailSchema,
  password: passwordSchema,
}).strict();


const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
}).strict();

const forgotPasswordSchema = z.object({
  email: emailSchema,
}).strict();

const resetPasswordSchema = z.object({
  token: z.string().min(32).max(512),
  newPassword: passwordSchema,
}).strict();

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: passwordSchema,
}).strict();

const refreshSchema = z.object({}).strict();


const verifyEmailSchema = z.object({
  email: emailSchema,
  otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 digits"),
}).strict();

const resendOtpSchema = z.object({
  email: emailSchema,
}).strict();


module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  refreshSchema,
  verifyEmailSchema,
  resendOtpSchema,
};
