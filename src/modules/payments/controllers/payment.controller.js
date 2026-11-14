
const paymentService = require("../services/payment.service");

const {
    createOrderSchema,
    verifyPaymentSchema,
    createRefundSchema,
} = require("../validation/payment.validation");

const crypto = require("crypto");
const env = require("../../../config/env");

async function createOrder(req, res, next) {
    try {
        const validation = createOrderSchema.safeParse({
            body: req.body,
            headers: req.headers,
        });

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                code: "VALIDATION_ERROR",
                message: "Please provide valid payment details.",
                errors: validation.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const { planVersionId } = validation.data.body;
        const idempotencyKey =
            validation.data.headers["idempotency-key"];

        const result = await paymentService.createOrder({
            planVersionId,
            userId: req.user.id,
            idempotencyKey,
        });

        return res.status(201).json({
            success: true,
            message: "Payment order created successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

async function verifyPayment(req, res, next) {
    try {
        const validation = verifyPaymentSchema.safeParse({
            body: req.body,
        });

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                code: "VALIDATION_ERROR",
                message: "Please provide valid payment verification details.",
                errors: validation.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const {
            paymentId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
        } = validation.data.body;

        const result = await paymentService.verifyPayment({
            paymentId,
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            razorpaySignature: razorpay_signature,
            userId: req.user.id,
        });

        return res.status(200).json({
            success: true,
            message: "Payment verification completed.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

// =========================================================
// CREATE REFUND - SUPER ADMIN
// =========================================================

async function createRefund(req, res, next) {
    try {
        const validation = createRefundSchema.safeParse({
            body: req.body,
            params: req.params,
            headers: req.headers,
        });

        if (!validation.success) {
            return res.status(400).json({
                success: false,
                code: "VALIDATION_ERROR",
                message: "Please provide valid refund details.",
                errors: validation.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }

        const { paymentId } = validation.data.params;
        const { amount, reason } = validation.data.body;

        const idempotencyKey =
            validation.data.headers["idempotency-key"];

        const result = await paymentService.createRefund({
            paymentId,
            amount,
            reason,
            idempotencyKey,
            adminId: req.user.id,
        });

        return res.status(202).json({
            success: true,
            message: "Refund request submitted successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

// =========================================================
// RAZORPAY WEBHOOK
// =========================================================

async function handleWebhook(req, res, next) {
    try {
        // 1. Ensure the original raw request body is available.
        if (!Buffer.isBuffer(req.body)) {
            return res.status(400).json({
                success: false,
                code: "INVALID_WEBHOOK_BODY",
                message: "Invalid webhook request body.",
            });
        }

        // 2. Read Razorpay webhook headers.
        const signature = req.headers["x-razorpay-signature"];
        const eventId = req.headers["x-razorpay-event-id"];

        if (
            typeof signature !== "string" ||
            !/^[a-f0-9]{64}$/i.test(signature) ||
            typeof eventId !== "string" ||
            !eventId.trim()
        ) {
            return res.status(400).json({
                success: false,
                code: "INVALID_WEBHOOK_HEADERS",
                message: "Required webhook headers are missing or invalid.",
            });
        }

        // 3. Verify the signature using the webhook secret.
        if (!env.RAZORPAY_WEBHOOK_SECRET) {
            req.log?.error("Razorpay webhook secret is not configured.");

            return res.status(503).json({
                success: false,
                code: "WEBHOOK_NOT_CONFIGURED",
                message: "Webhook processing is temporarily unavailable.",
            });
        }

        const expectedSignature = crypto
            .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
            .update(req.body)
            .digest();

        const receivedSignature = Buffer.from(signature, "hex");

        if (
            receivedSignature.length !== expectedSignature.length ||
            !crypto.timingSafeEqual(
                receivedSignature,
                expectedSignature
            )
        ) {
            return res.status(400).json({
                success: false,
                code: "INVALID_WEBHOOK_SIGNATURE",
                message: "Webhook signature verification failed.",
            });
        }

        // 4. Parse JSON only after signature verification.
        let event;

        try {
            event = JSON.parse(req.body.toString("utf8"));
        } catch {
            return res.status(400).json({
                success: false,
                code: "INVALID_WEBHOOK_JSON",
                message: "Webhook payload is invalid.",
            });
        }

        if (!event || typeof event.event !== "string") {
            return res.status(400).json({
                success: false,
                code: "INVALID_WEBHOOK_EVENT",
                message: "Invalid webhook event.",
            });
        }

        // 5. Pass the verified event to the service.
        const result = await paymentService.handleWebhookEvent({
            eventId: eventId.trim(),
            event,
            rawBody: req.body,
        });

        return res.status(200).json({
            success: true,
            message: "Webhook received successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

// =========================================================
// GET PAYMENT BY ID
// =========================================================

async function getPaymentById(req, res, next) {
    try {
        const { paymentId } = req.params;

        if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                paymentId
            )
        ) {
            return res.status(400).json({
                success: false,
                code: "VALIDATION_ERROR",
                message: "Invalid payment ID.",
            });
        }

        const result = await paymentService.getPaymentById({
            paymentId,
            userId: req.user.id,
        });

        return res.status(200).json({
            success: true,
            message: "Payment details retrieved successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

// =========================================================
// GET PAYMENT HISTORY
// =========================================================

async function getPaymentHistory(req, res, next) {
    try {
        const page = Number(req.query.page || 1);
        const limit = Number(req.query.limit || 10);

        if (
            !Number.isInteger(page) ||
            page < 1 ||
            !Number.isInteger(limit) ||
            limit < 1 ||
            limit > 50
        ) {
            return res.status(400).json({
                success: false,
                code: "VALIDATION_ERROR",
                message: "Invalid pagination parameters.",
            });
        }

        const result = await paymentService.getPaymentHistory({
            userId: req.user.id,
            page,
            limit,
        });

        return res.status(200).json({
            success: true,
            message: "Payment history retrieved successfully.",
            data: result,
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    createOrder,
    verifyPayment,
    createRefund,
    handleWebhook,
    getPaymentById,
    getPaymentHistory,
};
