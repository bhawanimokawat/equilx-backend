
const express = require("express");

const {
    requireAuth,
    requireSuperAdmin,
} = require("../../../middleware/auth.middleware");

const paymentController = require("../controllers/payment.controller");

const router = express.Router();

// Create and verify individual payments.
router.post("/orders", requireAuth, paymentController.createOrder);
router.post("/verify", requireAuth, paymentController.verifyPayment);

// Razorpay webhook must be public.
// Authentication is replaced by Razorpay signature verification.
router.post("/webhook", paymentController.handleWebhook);

// Super Admin only: initiate full or partial payment refund.
router.post(
    "/:paymentId/refund",
    requireAuth,
    requireSuperAdmin,
    paymentController.createRefund
);

// Specific routes must come before dynamic routes.
router.get("/history", requireAuth, paymentController.getPaymentHistory);

// Dynamic payment route must remain last.
router.get("/:paymentId", requireAuth, paymentController.getPaymentById);

module.exports = router;
