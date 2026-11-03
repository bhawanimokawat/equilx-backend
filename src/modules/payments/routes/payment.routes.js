const express = require("express");

const { requireAuth } = require("../../../middleware/auth.middleware");
const paymentController = require("../controllers/payment.controller");

const router = express.Router();

// Create and verify individual payments.
router.post("/orders", requireAuth, paymentController.createOrder);
router.post("/verify", requireAuth, paymentController.verifyPayment);

// Specific routes must come before dynamic routes.
router.get("/history", requireAuth, paymentController.getPaymentHistory);

// Dynamic payment route must remain last.
router.get("/:paymentId", requireAuth, paymentController.getPaymentById);

module.exports = router;