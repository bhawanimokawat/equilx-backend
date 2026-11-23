
const { z } = require("zod");

const uuidSchema = z.string().uuid();

const instituteParamsSchema = z.object({
  instituteId: uuidSchema,
});

const createBatchSchema = z.object({
  params: instituteParamsSchema,
  body: z.object({
    name: z.string().trim().min(2).max(150),
    trainerId: uuidSchema.nullable().optional(),
  }).strict(),
});

const updateBatchSchema = z.object({
  params: instituteParamsSchema.extend({
    batchId: uuidSchema,
  }),
  body: z.object({
    name: z.string().trim().min(2).max(150).optional(),
    trainerId: uuidSchema.nullable().optional(),
  })
    .strict()
    .refine(
      (data) => Object.keys(data).length > 0,
      { message: "At least one field must be provided." }
    ),
});

const batchIdSchema = z.object({
  params: instituteParamsSchema.extend({
    batchId: uuidSchema,
  }),
});

const listBatchesSchema = z.object({
  params: instituteParamsSchema,
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(150).optional(),
    trainerId: uuidSchema.optional(),
  }).strict(),
});

const addBatchMembersSchema = z.object({
  params: instituteParamsSchema.extend({
    batchId: uuidSchema,
  }),
  body: z.object({
    userIds: z.array(uuidSchema).min(1).max(500),
  }).strict().refine(
    (data) => new Set(data.userIds).size === data.userIds.length,
    { message: "Duplicate student IDs are not allowed." }
  ),
});

const removeBatchMemberSchema = z.object({
  params: instituteParamsSchema.extend({
    batchId: uuidSchema,
    userId: uuidSchema,
  }),
});

const listBatchMembersSchema = z.object({
  params: instituteParamsSchema.extend({
    batchId: uuidSchema,
  }),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(150).optional(),
  }).strict(),
});

const myBatchesSchema = z.object({
  params: instituteParamsSchema,
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }).strict(),
});

module.exports = {
  createBatchSchema,
  updateBatchSchema,
  batchIdSchema,
  listBatchesSchema,
  addBatchMembersSchema,
  removeBatchMemberSchema,
  listBatchMembersSchema,
  myBatchesSchema,
};
