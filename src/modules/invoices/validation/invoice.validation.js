const { z } = require("zod");

const listInvoicesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
});

const invoiceIdSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID."),
});

module.exports = {
  listInvoicesSchema,
  invoiceIdSchema,
};
