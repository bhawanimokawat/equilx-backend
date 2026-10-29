const { z } = require("zod");

const listUsersSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(100).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .strict();

const updateUserStatusSchema = z
  .object({
    isActive: z.boolean(),
  })
  .strict();

const userIdParamSchema = z
  .object({
    id: z.string().uuid(),
  })
  .strict();

module.exports = {
  listUsersSchema,
  updateUserStatusSchema,
  userIdParamSchema
};
