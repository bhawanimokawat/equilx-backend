
const { z } = require("zod");

// --------------------------------------------------
// Common schemas
// --------------------------------------------------

const ownerTypeSchema = z.enum([
  "STUDENT",
  "INSTITUTE",
]);

const planCodeSchema = z.object({
  code: z.enum([
    "FREE",
    "STUDENT_PRO",
    "INSTITUTE_6_MONTH",
    "INSTITUTE_12_MONTH",
  ]),
});

const planIdParamSchema = z.object({
  planId: z.string().uuid(),
});

// --------------------------------------------------
// Plan version schema
// --------------------------------------------------

const planVersionSchema = z.object({
  priceInclGst: z.coerce
    .number()
    .min(0)
    .max(9999999999.99),

  currency: z.string().trim().length(3).default("INR"),

  gstRate: z.coerce
    .number()
    .min(0)
    .max(100)
    .default(18),

  durationMonths: z.coerce
    .number()
    .int()
    .positive()
    .nullable()
    .optional(),

  fullMockQuota: z.coerce
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional(),

  practiceQuota: z.coerce
    .number()
    .int()
    .nonnegative()
    .nullable()
    .optional(),

  isLifetime: z.boolean().default(false),

  effectiveFrom: z.coerce.date().optional(),
});

// --------------------------------------------------
// Public plan APIs
// --------------------------------------------------

const listPlansSchema = z.object({
  ownerType: ownerTypeSchema.optional(),
});

// --------------------------------------------------
// Admin plan listing
// --------------------------------------------------

const listAdminPlansSchema = z.object({
  ownerType: ownerTypeSchema.optional(),

  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

// --------------------------------------------------
// Create plan
// --------------------------------------------------

const createPlanSchema = z.object({
  code: z.enum([
    "FREE",
    "STUDENT_PRO",
    "INSTITUTE_6_MONTH",
    "INSTITUTE_12_MONTH",
  ]),

  name: z.string().trim().min(2).max(100),

  ownerType: ownerTypeSchema,

  description: z
    .string()
    .trim()
    .max(1000)
    .nullable()
    .optional(),

  version: planVersionSchema,
});

// --------------------------------------------------
// Update plan metadata
// --------------------------------------------------

const updatePlanSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),

    description: z
      .string()
      .trim()
      .max(1000)
      .nullable()
      .optional(),
  })
  .strict()
  .refine(
    (data) => Object.keys(data).length > 0,
    {
      message: "At least one plan field must be provided.",
    }
  );

// --------------------------------------------------
// Update plan status
// --------------------------------------------------

const updatePlanStatusSchema = z.object({
  isActive: z.boolean(),
});

// --------------------------------------------------
// Create new pricing version
// --------------------------------------------------

const createPlanVersionSchema = planVersionSchema;

// --------------------------------------------------
// Exports
// --------------------------------------------------

module.exports = {
  ownerTypeSchema,
  planCodeSchema,
  planIdParamSchema,
  planVersionSchema,

  // Public
  listPlansSchema,

  // Admin
  listAdminPlansSchema,
  createPlanSchema,
  updatePlanSchema,
  updatePlanStatusSchema,
  createPlanVersionSchema,
};
