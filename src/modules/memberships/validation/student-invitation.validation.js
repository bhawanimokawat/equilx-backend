const { z } = require("zod");

const studentDetailsSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address.")
    .max(254)
    .transform((email) => email.toLowerCase()),

  name: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional(),

  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^\+?[0-9\s().-]+$/, "Invalid phone number.")
    .optional(),
}).strict();

const createStudentInvitationSchema = studentDetailsSchema;

const createBulkStudentInvitationsSchema = z.object({
  students: z
    .array(studentDetailsSchema)
    .min(1, "At least one student is required.")
    .max(100, "A maximum of 100 students can be invited at once."),
}).strict().superRefine((data, ctx) => {
  const emails = new Set();

  data.students.forEach((student, index) => {
    if (emails.has(student.email)) {
      ctx.addIssue({
        code: "custom",
        path: ["students", index, "email"],
        message: "Duplicate email address in this request.",
      });
    }

    emails.add(student.email);
  });
});


const listStudentInvitationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z
    .enum([
      "PENDING",
      "ACCEPTED_PENDING_APPROVAL",
      "APPROVED",
      "REJECTED",
      "EXPIRED",
      "CANCELLED",
    ])
    .optional(),
}).strict();


const invitationIdSchema = z.object({
  id: z.string().uuid("A valid invitation ID is required."),
}).strict();


const acceptStudentInvitationSchema = z.object({
  token: z.string().trim().min(64).max(128),
}).strict();


module.exports = {
  createStudentInvitationSchema,
  createBulkStudentInvitationsSchema,
  listStudentInvitationsSchema,
  invitationIdSchema,
  acceptStudentInvitationSchema,
};
