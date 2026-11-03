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

module.exports = {
  createOrderSchema,
  verifyPaymentSchema
};
