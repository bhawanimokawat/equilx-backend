const { z } = require("zod");

const membershipIdParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

const createMembershipSchema = z
  .object({
    userId: z.string().uuid(),
    role: z.enum([
      "INSTITUTE_STUDENT",
      "TRAINER",
      "INSTITUTE_ADMIN",
    ]),
  })
  .strict();

const updateMembershipSchema = z
  .object({
    role: z
      .enum([
        "INSTITUTE_STUDENT",
        "TRAINER",
        "INSTITUTE_ADMIN",
      ])
      .optional(),
    status: z
      .enum([
        "PENDING_APPROVAL",
        "ACTIVE",
        "SUSPENDED",
        "REVOKED",
      ])
      .optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided.",
  });

const listMembershipsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    role: z
      .enum([
        "INSTITUTE_STUDENT",
        "TRAINER",
        "INSTITUTE_ADMIN",
      ])
      .optional(),
    status: z
      .enum([
        "PENDING_APPROVAL",
        "ACTIVE",
        "SUSPENDED",
        "REVOKED",
      ])
      .optional(),
  })
  .strict();



  const instituteIdParamSchema = z
  .object({
    instituteId: z.string().uuid(),
  })
  .strict();

const membershipRouteParamsSchema = z
  .object({
    instituteId: z.string().uuid(),
    id: z.string().uuid(),
  })
  .strict();
module.exports = {
  membershipIdParamSchema,
  createMembershipSchema,
  updateMembershipSchema,
  listMembershipsQuerySchema,
  instituteIdParamSchema,
  membershipRouteParamsSchema,
};
