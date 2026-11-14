const { z } = require("zod");

const createOrderSchema = z.object({
  body: z.object({
    planVersionId: z.string().uuid("Invalid plan version ID"),
  }).strict(),
  headers: z.object({
    "idempotency-key": z
      .string()
      .trim()
      .min(16, "Idempotency key must be at least 16 characters")
      .max(128, "Idempotency key is too long"),
  }).passthrough(),
});

const verifyPaymentSchema = z.object({
  body: z.object({
    paymentId: z.string().uuid("Invalid payment ID"),
    razorpay_order_id: z.string().min(1),
    razorpay_payment_id: z.string().min(1),
    razorpay_signature: z
      .string()
      .regex(/^[a-f0-9]{64}$/i, "Invalid Razorpay signature"),
  }).strict(),
});

const createRefundSchema = z.object({
  body: z.object({
    amount: z
      .number()
      .positive("Refund amount must be greater than zero")
      .optional(),

    reason: z
      .string()
      .trim()
      .min(3, "Reason must be at least 3 characters")
      .max(500, "Reason is too long")
      .optional(),
  }).strict(),

  params: z.object({
    paymentId: z.string().uuid("Invalid payment ID"),
  }),

  headers: z.object({
    "idempotency-key": z
      .string()
      .trim()
      .min(16, "Idempotency key must be at least 16 characters")
      .max(128, "Idempotency key is too long"),
  }).passthrough(),
});

    
module.exports = {
  createOrderSchema,
  verifyPaymentSchema,
    createRefundSchema,
};
