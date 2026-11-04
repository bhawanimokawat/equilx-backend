const { z } = require("zod");

const uuidSchema = z.string().uuid();

const instituteParamsSchema = z.object({
  instituteId: uuidSchema,
}).strict();

const conversationParamsSchema = z.object({
  instituteId: uuidSchema,
  conversationId: uuidSchema,
}).strict();

// 1. Create direct conversation
const createDirectConversationSchema = z.object({
  params: instituteParamsSchema,

  body: z.object({
    recipientUserId: uuidSchema,
  }).strict(),
});

// 2. Create institute or batch group
const createGroupConversationSchema = z.object({
  params: instituteParamsSchema,

  body: z.object({
    title: z.string().trim().min(2).max(150),
    batchId: uuidSchema.nullable().optional(),
    participantIds: z.array(uuidSchema).min(1).max(100),
  }).strict().refine(
    (data) => new Set(data.participantIds).size === data.participantIds.length,
    { message: "Duplicate participant IDs are not allowed." }
  ),
});

// 3. List conversations
const listConversationsSchema = z.object({
  params: instituteParamsSchema,

  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(150).optional(),
    status: z.enum(["ACTIVE", "ARCHIVED", "CLOSED"]).optional(),
  }).strict(),
});

// 4. Get, update or archive conversation
const conversationIdSchema = z.object({
  params: conversationParamsSchema,
});

// 5. Update conversation
const updateConversationSchema = z.object({
  params: conversationParamsSchema,

  body: z.object({
    title: z.string().trim().min(2).max(150),
  }).strict().refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field must be provided." }
  ),
});

// 6. Add participants
const addParticipantsSchema = z.object({
  params: conversationParamsSchema,

  body: z.object({
    userIds: z.array(uuidSchema).min(1).max(100),
  }).strict().refine(
    (data) => new Set(data.userIds).size === data.userIds.length,
    { message: "Duplicate participant IDs are not allowed." }
  ),
});

// 7. Remove participant
const removeParticipantSchema = z.object({
  params: z.object({
    ...conversationParamsSchema.shape,
    userId: uuidSchema,
  }).strict(),
});

// 8. List messages
const listMessagesSchema = z.object({
  params: conversationParamsSchema,

  query: z.object({
    limit: z.coerce.number().int().min(1).max(100).default(30),
    beforeId: uuidSchema.optional(),
  }).strict(),
});

// 9. Edit message
const editMessageSchema = z.object({
  params: z.object({
    ...conversationParamsSchema.shape,
    messageId: uuidSchema,
  }).strict(),

  body: z.object({
    content: z.string().trim().min(1).max(10000),
  }).strict(),
});

// 10. Delete message
const deleteMessageSchema = z.object({
  params: z.object({
    ...conversationParamsSchema.shape,
    messageId: uuidSchema,
  }).strict(),
});

// 11. Mark conversation as read
const markConversationReadSchema = z.object({
  params: conversationParamsSchema,

  body: z.object({
    lastMessageId: uuidSchema.optional(),
  }).strict(),
});

const sendMessageSchema = z.object({
  params: conversationParamsSchema,
  body: z.object({
    content: z.string().trim().min(1).max(5000),
    clientMessageId: uuidSchema,
  }).strict(),
});

module.exports = {
  createDirectConversationSchema,
  createGroupConversationSchema,
  listConversationsSchema,
  conversationIdSchema,
  updateConversationSchema,
  addParticipantsSchema,
  removeParticipantSchema,
  listMessagesSchema,
  editMessageSchema,
  deleteMessageSchema,
  markConversationReadSchema,
  sendMessageSchema,
};
