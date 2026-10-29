const { z } = require("zod");

const uuidSchema = z.string().uuid();

const leadStatusSchema = z.enum([
  "NEW",
  "CONTACTED",
  "DEMO_BOOKED",
  "NEGOTIATION",
  "ENROLLED",
  "LOST",
]);

const leadActivityTypeSchema = z.enum([
  "CALL",
  "EMAIL",
  "MEETING",
  "NOTE",
  "FOLLOW_UP",
  "OTHER",
]);

const leadConsentTypeSchema = z.enum([
  "MARKETING_EMAIL",
  "MARKETING_SMS",
  "MARKETING_CALL",
  "OTHER",
]);

const leadConsentStatusSchema = z.enum([
  "GRANTED",
  "DENIED",
  "WITHDRAWN",
]);

const instituteIdParamSchema = z.object({
  instituteId: uuidSchema,
}).strict();

const leadIdParamSchema = z.object({
  instituteId: uuidSchema,
  leadId: uuidSchema,
}).strict();

const activityIdParamSchema = z.object({
  instituteId: uuidSchema,
  leadId: uuidSchema,
  activityId: uuidSchema,
}).strict();

const sourceIdParamSchema = z.object({
  instituteId: uuidSchema,
  sourceId: uuidSchema,
}).strict();

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: leadStatusSchema.optional(),
  ownerId: uuidSchema.optional(),
  search: z.string().trim().max(100).optional(),
  dueFollowUps: z.enum(["true", "false"]).optional(),
}).strict();

const optionalText = (max) =>
  z.string().trim().max(max).optional().nullable();

const createLeadSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(254).optional().nullable(),
  phone: z.string().trim().min(5).max(30).optional().nullable(),
  interestedIn: optionalText(150),
  sourceId: uuidSchema.optional().nullable(),
  ownerId: uuidSchema.optional().nullable(),
  notes: optionalText(5000),
  nextFollowUpAt: z.coerce.date().optional().nullable(),

  targetBand: z.coerce.number().min(0).max(9).optional().nullable(),
  examDate: z.coerce.date().optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
}).strict().refine(
  (data) => Boolean(data.email || data.phone),
  {
    message: "Provide at least an email address or phone number.",
    path: ["email"],
  }
);

const updateLeadSchema = z.object({
  name: z.string().trim().min(1).max(150).optional(),
  email: z.string().trim().email().max(254).optional().nullable(),
  phone: z.string().trim().min(5).max(30).optional().nullable(),
  interestedIn: optionalText(150),
  sourceId: uuidSchema.optional().nullable(),
  ownerId: uuidSchema.optional().nullable(),
  notes: optionalText(5000),
  nextFollowUpAt: z.coerce.date().optional().nullable(),
  status: leadStatusSchema.optional(),
  targetBand: z.coerce.number().min(0).max(9).optional().nullable(),
  examDate: z.coerce.date().optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(50)).max(30).optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update." }
);


const createActivitySchema = z.object({
  type: leadActivityTypeSchema,
  subject: z.string().trim().max(200).optional().nullable(),
  description: z.string().trim().max(5000).optional().nullable(),
  outcome: z.string().trim().max(1000).optional().nullable(),
  followUpAt: z.coerce.date().optional().nullable(),
}).strict();

const assignLeadSchema = z.object({
  assignedToId: uuidSchema,
  note: z.string().trim().max(1000).optional().nullable(),
}).strict();

const createLeadSourceSchema = z.object({
  name: z.string().trim().min(1).max(100),
}).strict();

const updateLeadSourceSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
}).strict().refine(
  (data) => Object.keys(data).length > 0,
  { message: "Provide at least one field to update." }
);

const createConsentSchema = z.object({
  type: leadConsentTypeSchema,
  status: leadConsentStatusSchema,
  evidenceRef: z.string().trim().max(500).optional().nullable(),
  note: z.string().trim().max(1000).optional().nullable(),
}).strict();

const updateLeadStatusSchema = z.object({
  status: leadStatusSchema,
  reason: z.string().trim().max(1000).optional().nullable(),
}).strict();




const createLeadFollowUpSchema = z.object({
  title: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(5000).optional().nullable(),
  assignedToId: uuidSchema.optional(),
  dueAt: z.coerce.date(),
}).strict();

const followUpIdParamSchema = z.object({
  instituteId: uuidSchema,
  followUpId: uuidSchema,
}).strict();

const listFollowUpsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["PENDING", "COMPLETED", "CANCELLED"]).optional(),
  due: z.enum(["today", "overdue", "upcoming"]).optional(),
  assignedToId: uuidSchema.optional(),
}).strict();



const importLeadsCsvSchema = z.object({
  csv: z.string().min(1).max(2_000_000),
}).strict();


module.exports = {
  uuidSchema,
  leadStatusSchema,
  leadActivityTypeSchema,
  leadConsentTypeSchema,
  leadConsentStatusSchema,
  instituteIdParamSchema,
  leadIdParamSchema,
  activityIdParamSchema,
  sourceIdParamSchema,
  paginationSchema,
  createLeadSchema,
  updateLeadSchema,
  createActivitySchema,
  assignLeadSchema,
  createLeadSourceSchema,
  updateLeadSourceSchema,
  createConsentSchema,
  updateLeadStatusSchema,
  createLeadFollowUpSchema,
  followUpIdParamSchema,
  listFollowUpsSchema,
  importLeadsCsvSchema,
};
