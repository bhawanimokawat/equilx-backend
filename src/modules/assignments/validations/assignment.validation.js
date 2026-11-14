const { z } = require("zod");

const uuidSchema = z.string().uuid();

const createAssignmentSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3).max(200),

    instructions: z.string().trim().max(10000).nullable().optional(),

    dueAt: z.string().datetime({ offset: true }).nullable().optional(),

    contents: z.array(
      z.object({
        testVersionId: uuidSchema,
        position: z.number().int().min(1),
        instructions: z.string().trim().max(5000).nullable().optional(),
      }).strict()
    ).min(1).max(20),

    directUserIds: z.array(uuidSchema).max(500).default([]),

    batchIds: z.array(uuidSchema).max(100).default([]),
  }).strict(),
});

const updateAssignmentSchema = z.object({
  params: z.object({
    assignmentId: uuidSchema,
  }).strict(),

  body: z.object({
    title: z.string().trim().min(3).max(200).optional(),

    instructions: z.string().trim().max(10000).nullable().optional(),

    dueAt: z.string().datetime({ offset: true }).nullable().optional(),

    contents: z.array(
      z.object({
        testVersionId: uuidSchema,
        position: z.number().int().min(1),
        instructions: z.string().trim().max(5000).nullable().optional(),
      }).strict()
    ).min(1).max(20).optional(),

    directUserIds: z.array(uuidSchema).max(500).optional(),

    batchIds: z.array(uuidSchema).max(100).optional(),
  }).strict().refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided." }
  ),
});

const assignmentIdSchema = z.object({
  params: z.object({
    assignmentId: uuidSchema,
  }).strict(),
});

const listAssignmentsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum([
      "DRAFT",
      "PUBLISHED",
      "CLOSED",
      "CANCELLED",
    ]).optional(),
    search: z.string().trim().max(200).optional(),
  }).strict(),
});

const publishAssignmentSchema = z.object({
  params: z.object({
    assignmentId: uuidSchema,
  }).strict(),
});

const studentAssignmentListSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum([
      "ASSIGNED",
      "IN_PROGRESS",
      "COMPLETED",
      "OVERDUE",
      "EXCUSED",
    ]).optional(),
  }).strict(),
});

module.exports = {
  createAssignmentSchema,
  updateAssignmentSchema,
  assignmentIdSchema,
  listAssignmentsSchema,
  publishAssignmentSchema,
  studentAssignmentListSchema,
};
