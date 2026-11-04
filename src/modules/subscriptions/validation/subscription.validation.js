const { z } = require("zod");

const subscriptionIdSchema = z.object({
  subscriptionId: z.string().uuid("Invalid subscription ID"),
});

const subscriptionHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

module.exports = {
  subscriptionIdSchema,
  subscriptionHistoryQuerySchema,
};