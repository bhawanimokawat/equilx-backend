
const crypto = require("crypto");

const paymentWebhookService = require("./payment-webhook.service");
const env = require("../../../config/env");
const { prisma } = require("../../../config/database");
const razorpay = require("../../../config/razorpay");
const { PaymentStatus, SubscriptionStatus, Prisma } = require("@prisma/client");

class PaymentService {
    createError(message, statusCode, code) {
        const error = new Error(message);
        error.statusCode = statusCode;
        error.code = code;
        return error;
    }

    formatPayment(payment) {
        return {
            paymentId: payment.id,
            subscriptionId: payment.subscriptionId,
            orderId: payment.providerOrderId,
            amount: payment.amountInclGst.toString(),
            currency: payment.currency,
            status: payment.status,
            keyId: env.RAZORPAY_KEY_ID,
        };
    }

    async createOrder({
        planVersionId,
        userId,
        instituteId,
        idempotencyKey,
        renewalOfSubscriptionId,
    }) {
        // 1. Validate ownership.
        if ((!userId && !instituteId) || (userId && instituteId)) {
            throw this.createError(
                "Exactly one subscription owner is required.",
                400,
                "INVALID_SUBSCRIPTION_OWNER"
            );
        }

        if (!idempotencyKey) {
            throw this.createError(
                "Idempotency key is required.",
                400,
                "IDEMPOTENCY_KEY_REQUIRED"
            );
        }

        const normalizedIdempotencyKey = idempotencyKey.trim();

        // 2. Check whether this request was already processed.
        const existingPayment = await prisma.payment.findUnique({
            where: { idempotencyKey: normalizedIdempotencyKey },
            include: { subscription: true },
        });

        if (existingPayment) {
            const subscription = existingPayment.subscription;

            const ownsPayment = userId
                ? subscription.userId === userId
                : subscription.instituteId === instituteId;

            if (!ownsPayment) {
                throw this.createError(
                    "This idempotency key belongs to another account.",
                    409,
                    "IDEMPOTENCY_KEY_CONFLICT"
                );
            }

            if (existingPayment.providerOrderId) {
                return this.formatPayment(existingPayment);
            }

            throw this.createError(
                "This payment request is already being processed. Please try again later.",
                409,
                "PAYMENT_PROCESSING"
            );
        }

        // 3. Validate the selected plan version.
        const planVersion = await prisma.planVersion.findUnique({
            where: { id: planVersionId },
            include: { plan: true },
        });

        if (
            !planVersion ||
            !planVersion.plan.isActive ||
            planVersion.effectiveFrom > new Date()
        ) {
            throw this.createError(
                "Selected plan is unavailable.",
                404,
                "PLAN_NOT_AVAILABLE"
            );
        }

        const expectedOwnerType = userId ? "INDIVIDUAL" : "INSTITUTE";

        if (planVersion.plan.ownerType !== expectedOwnerType) {
            throw this.createError(
                "Selected plan is not available for this account type.",
                400,
                "PLAN_OWNER_MISMATCH"
            );
        }

        if (planVersion.plan.code === "FREE") {
            throw this.createError(
                "Free plans do not require payment.",
                400,
                "FREE_PLAN_PAYMENT_NOT_ALLOWED"
            );
        }

        // 4. Convert the database Decimal amount to paise.
        const price = planVersion.priceInclGst.toFixed(2);
        const [rupees, paise = "00"] = price.split(".");
        const amountInPaise = Number(rupees) * 100 + Number(paise);

        if (!Number.isSafeInteger(amountInPaise) || amountInPaise <= 0) {
            throw this.createError(
                "Invalid plan amount.",
                500,
                "INVALID_PLAN_AMOUNT"
            );
        }

        // 5. Reserve the subscription and payment atomically.
        let payment;

        try {
            payment = await prisma.$transaction(async (tx) => {
                const subscription = await tx.subscription.create({
                    data: {
                        planId: planVersion.planId,
                        planVersionId: planVersion.id,
                        userId: userId || null,
                        instituteId: instituteId || null,
                        status: SubscriptionStatus.PENDING_PAYMENT,
                        priceInclGst: planVersion.priceInclGst,
                        currency: planVersion.currency,
                        gstRate: planVersion.gstRate,
                        durationMonths: planVersion.durationMonths,
                        renewalOfSubscriptionId: renewalOfSubscriptionId || null,
                    },
                });

                return tx.payment.create({
                    data: {
                        subscriptionId: subscription.id,
                        status: PaymentStatus.CREATED,
                        amountInclGst: planVersion.priceInclGst,
                        currency: planVersion.currency,
                        idempotencyKey: normalizedIdempotencyKey,

                        // Payment expires after 15 minutes
                        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
                    },
                    include: { subscription: true },
                });
            });
        } catch (error) {
            // Another request may have reserved this key first.
            if (error.code === "P2002") {
                const concurrentPayment = await prisma.payment.findUnique({
                    where: { idempotencyKey: normalizedIdempotencyKey },
                });

                if (concurrentPayment) {
                    throw this.createError(
                        "This payment request is already being processed.",
                        409,
                        "PAYMENT_PROCESSING"
                    );
                }
            }

            throw error;
        }

        // 6. Create the Razorpay order outside the database transaction.
        // Never hold a database transaction open during an external API call.
        const receipt = `pay_${crypto.randomUUID().replace(/-/g, "").slice(0, 32)}`;

        let order;

        try {
            order = await razorpay.orders.create({
                amount: amountInPaise,
                currency: planVersion.currency,
                receipt,
                notes: {
                    paymentId: payment.id,
                    subscriptionId: payment.subscriptionId,
                    planCode: planVersion.plan.code,
                },
            });
        } catch (error) {
            // Keep the reservation intact. A network timeout can occur after
            // Razorpay has already created the order. Do not create another order
            // automatically with the same idempotency key.
            throw this.createError(
                "Payment order creation could not be confirmed. Please contact support before retrying.",
                503,
                "PAYMENT_ORDER_CREATION_UNCONFIRMED"
            );
        }

        // 7. Save the provider order ID.
        try {
            const updatedPayment = await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    providerOrderId: order.id,
                },
            });

            return this.formatPayment(updatedPayment);
        } catch (error) {
            // Razorpay may have created an order, but persistence failed.
            // Do not retry order creation automatically.
            throw this.createError(
                "Payment order was created but could not be saved. Please contact support.",
                503,
                "PAYMENT_ORDER_PERSISTENCE_FAILED"
            );
        }
    }

    async verifyPayment({
        paymentId,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        userId,
    }) {
        // 1. Validate required values.
        if (
            !paymentId ||
            !razorpayOrderId ||
            !razorpayPaymentId ||
            !razorpaySignature ||
            !userId
        ) {
            throw this.createError(
                "Required payment verification details are missing.",
                400,
                "INVALID_PAYMENT_DETAILS"
            );
        }

        // 2. Find payment and verify individual ownership.
        const payment = await prisma.payment.findFirst({
            where: {
                id: paymentId,
                providerOrderId: razorpayOrderId,
                subscription: {
                    userId,
                    instituteId: null,
                },
            },
        });

        if (!payment) {
            throw this.createError(
                "Payment record not found.",
                404,
                "PAYMENT_NOT_FOUND"
            );
        }

        // 3. Verify Razorpay checkout signature.
        const expectedSignature = crypto
            .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

        const received = Buffer.from(razorpaySignature, "hex");
        const expected = Buffer.from(expectedSignature, "hex");

        if (
            received.length !== expected.length ||
            !crypto.timingSafeEqual(received, expected)
        ) {
            throw this.createError(
                "Payment signature verification failed.",
                400,
                "INVALID_PAYMENT_SIGNATURE"
            );
        }

        // 4. Confirm payment directly with Razorpay.
        let providerPayment;

        try {
            providerPayment = await razorpay.payments.fetch(
                razorpayPaymentId
            );
        } catch (error) {
            throw this.createError(
                "Unable to confirm payment with the payment provider.",
                503,
                "PAYMENT_PROVIDER_UNAVAILABLE"
            );
        }

        // 5. Validate provider payment details.
        const expectedAmount = Number(
            payment.amountInclGst
                .mul(100)
                .toDecimalPlaces(0)
                .toString()
        );

        if (
            providerPayment.order_id !== payment.providerOrderId ||
            providerPayment.amount !== expectedAmount ||
            providerPayment.currency !== payment.currency
        ) {
            throw this.createError(
                "Payment details do not match our records.",
                400,
                "PAYMENT_DETAILS_MISMATCH"
            );
        }

        if (providerPayment.status === "failed") {
            throw this.createError(
                "Payment was not successful. Please wait for payment status confirmation.",
                409,
                "PAYMENT_FAILED"
            );
        }

        if (providerPayment.status !== "captured") {
            throw this.createError(
                "Payment has not been successfully captured.",
                409,
                "PAYMENT_NOT_CAPTURED"
            );
        }

        // 6. Verification only. Subscription activation is handled
        // exclusively by the verified Razorpay webhook.
        return {
            paymentId: payment.id,
            orderId: payment.providerOrderId,
            providerPaymentId: razorpayPaymentId,
            paymentStatus: payment.status,
            providerPaymentStatus: providerPayment.status,
            activationPending: true,
            message: "Payment verified. Subscription activation is pending webhook confirmation.",
        };
    }

    async getPaymentById({ paymentId, userId }) {
        const payment = await prisma.payment.findFirst({
            where: {
                id: paymentId,
                subscription: {
                    userId,
                },
            },
            select: {
                id: true,
                subscriptionId: true,
                providerOrderId: true,
                amountInclGst: true,
                currency: true,
                status: true,
                provider: true,
                paidAt: true,
                createdAt: true,
                updatedAt: true,
                subscription: {
                    select: {
                        status: true,
                        startsAt: true,
                        endsAt: true,
                        plan: {
                            select: {
                                code: true,
                                name: true,
                            },
                        },
                    },
                },
            },
        });

        if (!payment) {
            throw this.createError(
                "Payment record not found.",
                404,
                "PAYMENT_NOT_FOUND"
            );
        }

        return {
            paymentId: payment.id,
            subscriptionId: payment.subscriptionId,
            orderId: payment.providerOrderId,
            amount: payment.amountInclGst.toString(),
            currency: payment.currency,
            provider: payment.provider,
            paymentStatus: payment.status,
            paidAt: payment.paidAt,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
            subscription: payment.subscription,
        };
    }

    async getPaymentHistory({ userId, page = 1, limit = 10 }) {
        const skip = (page - 1) * limit;

        const where = {
            subscription: {
                userId,
            },
        };

        const [payments, total] = await prisma.$transaction([
            prisma.payment.findMany({
                where,
                skip,
                take: limit,
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    id: true,
                    subscriptionId: true,
                    providerOrderId: true,
                    amountInclGst: true,
                    currency: true,
                    status: true,
                    paidAt: true,
                    createdAt: true,
                    subscription: {
                        select: {
                            status: true,
                            plan: {
                                select: {
                                    code: true,
                                },
                            },
                        },
                    },
                },
            }),

            prisma.payment.count({ where }),
        ]);

        return {
            payments: payments.map((payment) => ({
                paymentId: payment.id,
                subscriptionId: payment.subscriptionId,
                orderId: payment.providerOrderId,
                amount: payment.amountInclGst.toString(),
                currency: payment.currency,
                paymentStatus: payment.status,
                paidAt: payment.paidAt,
                createdAt: payment.createdAt,
                subscription: payment.subscription,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    // =========================================================
    // CREATE FULL / PARTIAL REFUND (SUPER ADMIN)
    // =========================================================

    async createRefund({
        paymentId,
        amount,
        reason,
        idempotencyKey,
        adminId,
    }) {
        if (!paymentId || !adminId || !idempotencyKey) {
            throw this.createError(
                "Payment ID, Super Admin ID and idempotency key are required.",
                400,
                "INVALID_REFUND_DETAILS"
            );
        }

        const normalizedKey = idempotencyKey.trim();

        // Return the original refund for an idempotent retry.
        const existingRefund = await prisma.paymentRefund.findUnique({
            where: { idempotencyKey: normalizedKey },
        });

        if (existingRefund) {
            if (existingRefund.paymentId !== paymentId) {
                throw this.createError(
                    "This idempotency key belongs to another refund request.",
                    409,
                    "REFUND_IDEMPOTENCY_CONFLICT"
                );
            }

            if (
                amount !== undefined &&
                !new Prisma.Decimal(amount).equals(existingRefund.amount)
            ) {
                throw this.createError(
                    "This idempotency key was already used with a different amount.",
                    409,
                    "REFUND_IDEMPOTENCY_CONFLICT"
                );
            }

            return {
                refundId: existingRefund.id,
                paymentId: existingRefund.paymentId,
                providerRefundId: existingRefund.providerRefundId,
                amount: existingRefund.amount.toString(),
                currency: existingRefund.currency,
                status: existingRefund.status,
                message: "Existing refund request returned.",
            };
        }

        const payment = await prisma.payment.findUnique({
            where: { id: paymentId },
        });

        if (!payment) {
            throw this.createError(
                "Payment record not found.",
                404,
                "PAYMENT_NOT_FOUND"
            );
        }

        if (
            payment.status !== PaymentStatus.SUCCEEDED &&
            payment.status !== PaymentStatus.PARTIALLY_REFUNDED
        ) {
            throw this.createError(
                "Only successful or partially refunded payments can be refunded.",
                409,
                "PAYMENT_NOT_REFUNDABLE"
            );
        }

        if (!payment.providerPaymentId) {
            throw this.createError(
                "Provider payment ID is missing for this payment.",
                409,
                "PROVIDER_PAYMENT_ID_MISSING"
            );
        }

        let refund;

        try {
            refund = await prisma.$transaction(async (tx) => {
                // Serialize refund reservations for this payment.
                await tx.$queryRaw`
                    SELECT id FROM "Payment"
                    WHERE id = ${paymentId}::uuid
                    FOR UPDATE
                `;

                const currentPayment = await tx.payment.findUnique({
                    where: { id: paymentId },
                });

                if (
                    !currentPayment ||
                    ![
                        PaymentStatus.SUCCEEDED,
                        PaymentStatus.PARTIALLY_REFUNDED,
                    ].includes(currentPayment.status)
                ) {
                    throw this.createError(
                        "Payment is no longer eligible for a refund.",
                        409,
                        "PAYMENT_NOT_REFUNDABLE"
                    );
                }

                const totals = await tx.paymentRefund.aggregate({
                    where: {
                        paymentId,
                        status: {
                            in: [
                                PaymentStatus.PENDING,
                                PaymentStatus.REFUNDED,
                            ],
                        },
                    },
                    _sum: {
                        amount: true,
                    },
                });

                const alreadyReserved =
                    totals._sum.amount || new Prisma.Decimal(0);

                const remaining = new Prisma.Decimal(
                    currentPayment.amountInclGst
                ).minus(alreadyReserved);

                const refundAmount =
                    amount === undefined
                        ? remaining
                        : new Prisma.Decimal(amount);

                if (
                    !refundAmount.isFinite() ||
                    refundAmount.lte(0) ||
                    refundAmount.decimalPlaces() > 2
                ) {
                    throw this.createError(
                        "Refund amount must be positive and have at most two decimal places.",
                        400,
                        "INVALID_REFUND_AMOUNT"
                    );
                }

                if (refundAmount.gt(remaining)) {
                    throw this.createError(
                        `Refund amount exceeds the remaining refundable balance of ${remaining.toFixed(2)}.`,
                        400,
                        "REFUND_AMOUNT_EXCEEDS_REMAINING"
                    );
                }

                const createdRefund = await tx.paymentRefund.create({
                    data: {
                        paymentId,
                        amount: refundAmount,
                        currency: currentPayment.currency,
                        reason: reason ? reason.trim() : null,
                        status: PaymentStatus.PENDING,
                        idempotencyKey: normalizedKey,
                    },
                });

                // Record the Super Admin action.
                await tx.auditLog.create({
                    data: {
                        actorId: adminId,
                        action: "PAYMENT_REFUND_INITIATED",
                        resourceType: "PAYMENT_REFUND",
                        resourceId: createdRefund.id,
                        metadata: {
                            paymentId,
                            amount: refundAmount.toFixed(2),
                            currency: currentPayment.currency,
                            reason: reason ? reason.trim() : null,
                            idempotencyKey: normalizedKey,
                        },
                    },
                });

                return createdRefund;
            });
        } catch (error) {
            if (error.code === "P2002") {
                const duplicate = await prisma.paymentRefund.findUnique({
                    where: { idempotencyKey: normalizedKey },
                });

                if (duplicate && duplicate.paymentId === paymentId) {
                    return {
                        refundId: duplicate.id,
                        paymentId: duplicate.paymentId,
                        providerRefundId: duplicate.providerRefundId,
                        amount: duplicate.amount.toString(),
                        currency: duplicate.currency,
                        status: duplicate.status,
                        message: "Existing refund request returned.",
                    };
                }
            }

            throw error;
        }

        // Submit the refund to Razorpay.
        // Do not mark it FAILED on a timeout because Razorpay may have
        // accepted the request. The verified webhook confirms final status.
        try {
            const amountInPaise = Number(
                refund.amount.mul(100).toFixed(0)
            );

            const providerRefund = await razorpay.payments.refund(
                payment.providerPaymentId,
                {
                    amount: amountInPaise,
                    notes: {
                        refundId: refund.id,
                        paymentId,
                        initiatedBy: adminId,
                    },
                }
            );

            const updatedRefund = await prisma.paymentRefund.update({
                where: { id: refund.id },
                data: {
                    providerRefundId: providerRefund.id,
                },
            });

            return {
                refundId: updatedRefund.id,
                paymentId: updatedRefund.paymentId,
                providerRefundId: updatedRefund.providerRefundId,
                amount: updatedRefund.amount.toString(),
                currency: updatedRefund.currency,
                status: updatedRefund.status,
                message: "Refund submitted. Final status will be confirmed by Razorpay webhook.",
            };
        } catch (error) {
            throw this.createError(
                "Refund submission could not be confirmed. The request remains pending; do not retry with a new idempotency key.",
                503,
                "REFUND_SUBMISSION_UNCONFIRMED"
            );
        }
    }

    async handleWebhookEvent({ eventId, event, rawBody }) {
        return paymentWebhookService.handleWebhookEvent({
            eventId,
            event,
            rawBody,
        });
    }
}

module.exports = new PaymentService();
