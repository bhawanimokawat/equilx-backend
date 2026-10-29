
require("dotenv").config();

const { z } = require("zod");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  PORT: z.coerce.number().int().min(1).max(65535).default(5000),

  FRONTEND_URL: z.string().min(1).default("http://localhost:5173"),

  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (value) =>
        value.startsWith("postgresql://") ||
        value.startsWith("postgres://"),
      "DATABASE_URL must be a PostgreSQL connection URL"
    ),

  SMTP_HOST: z.string().min(1, "SMTP_HOST is required"),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_USER: z.string().min(1, "SMTP_USER is required"),
  SMTP_PASS: z.string().min(1, "SMTP_PASS is required"),
  SMTP_FROM: z.string().min(1).optional(),

  OTP_HASH_SECRET: z.string().min(
    32,
    "OTP_HASH_SECRET must contain at least 32 characters"
  ),
  
  ACCESS_TOKEN_SECRET: z.string().min(
    32,
    "ACCESS_TOKEN_SECRET must contain at least 32 characters"
  ),

  ACCESS_TOKEN_TTL: z.string().default("15m"),

  REFRESH_TOKEN_TTL_DAYS: z.coerce
    .number()
    .int()
    .min(1)
    .max(30)
    .default(7),

});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "Invalid environment configuration:",
    parsed.error.issues.map(({ path, message }) => ({
      field: path.join("."),
      message,
    }))
  );

  process.exit(1);
}

module.exports = parsed.data;
