
const crypto = require("crypto");

const { prisma } = require("../../../config/database");
const { activateSuccessfulPayment } = require("./payment-activation.service");

const {
    PaymentStatus,
    PaymentProvider,
    Prisma,
} = require("@prisma/client");

class PaymentWebhookService {
    createError(message, statusCode, code) {
        const error = new Error(message);
        error.statusCode = statusCode;
        error.code = code;
        return error;
    }

    hashPayload(rawBody) {
        return crypto
            .createHash("sha256")
            .update(rawBody)
            .digest("hex");
    }

    async findPayment(orderId) {
        if (!orderId) {
            return null;
        }

        return prisma.payment.findFirst({
            where: {
                provider: PaymentProvider.RAZORPAY,
                providerOrderId: orderId,
            },
        });
    }

    validatePaymentDetails(payment, entity) {
        if (
            !payment ||
            !entity ||
            payment.providerOrderId !== entity.order_id ||
            payment.currency !== entity.currency
        ) {
            return false;
        }

        const expectedAmount = payment.amountInclGst
            .mul(100)
            .toDecimalPlaces(0)
            .toNumber();

        return (
            Number.isSafeInteger(expectedAmount) &&
            entity.amount === expectedAmount
        );
    }

    // =========================================================
    // SAVE WEBHOOK EVENT
    // =========================================================

    async saveWebhookEvent({ eventId, eventType, payloadHash }) {
        try {
            return await prisma.paymentWebhookEvent.create({
                data: {
                    provider: PaymentProvider.RAZORPAY,
                    providerEventId: eventId,
                    eventType,
                    payloadHash,
                    signatureVerifiedAt: new Date(),
                },
            });
        } catch (error) {
            if (error.code !== "P2002") {
                throw error;
            }

            const existingEvent =
                await prisma.paymentWebhookEvent.findUnique({
                    where: {
                        providerEventId: eventId,
                    },
                });

            if (!existingEvent) {
                throw this.createError(
                    "Unable to retrieve the existing webhook event.",
                    503,
                    "WEBHOOK_EVENT_LOOKUP_FAILED"
                );
            }

            if (existingEvent.payloadHash !== payloadHash) {
                throw this.createError(
                    "Webhook event ID was received with a different payload.",
                    409,
                    "WEBHOOK_PAYLOAD_CONFLICT"
                );
            }

            return existingEvent;
        }
    }

    // =========================================================
    // SUCCESSFUL PAYMENT
    // =========================================================

    async processCapturedPayment({ webhookEvent, entity }) {
        const payment = await this.findPayment(entity.order_id);

        if (!payment) {
            throw this.createError(
                "Matching payment order was not found.",
                503,
                "WEBHOOK_PAYMENT_NOT_FOUND"
            );
        }

        if (!this.validatePaymentDetails(payment, entity)) {
            throw this.createError(
                "Webhook payment details do not match our records.",
                409,
                "WEBHOOK_PAYMENT_MISMATCH"
            );
        }

        if (entity.status !== "captured") {
            throw this.createError(
                "Payment has not been captured.",
                409,
                "WEBHOOK_PAYMENT_NOT_CAPTURED"
            );
        }

        if (!entity.id) {
            throw this.createError(
                "Provider payment ID is missing.",
                400,
                "WEBHOOK_PAYMENT_ID_MISSING"
            );
        }

        await prisma.paymentWebhookEvent.update({
            where: { id: webhookEvent.id },
            data: {
                paymentId: payment.id,
            },
        });

        // Subscription activation remains exclusively webhook-driven.
        const activationResult = await activateSuccessfulPayment({
            paymentId: payment.id,
            providerPaymentId: entity.id,
            changedByUserId: null,
            allowExpiredRecovery: true,
        });

        return {
            processed: true,
            eventType: webhookEvent.eventType,
            paymentId: payment.id,
            paymentStatus: activationResult.paymentStatus,
            subscriptionStatus: activationResult.subscriptionStatus,
            invoiceId: activationResult.invoiceId,
            recoveredFromExpired:
                activationResult.recoveredFromExpired || false,
            alreadyActivated: activationResult.alreadyActivated || false,
            message: activationResult.recoveredFromExpired
                ? "Expired payment successfully recovered and subscription activated."
                : activationResult.alreadyActivated
                    ? "Payment was already activated."
                    : "Payment successfully activated.",
        };
    }

    // =========================================================
    // FAILED PAYMENT
    // =========================================================

    async processFailedPayment({ webhookEvent, entity }) {
        const payment = await this.findPayment(entity.order_id);

        if (!payment) {
            throw this.createError(
                "Matching payment order was not found.",
                503,
                "WEBHOOK_PAYMENT_NOT_FOUND"
            );
        }

        if (!this.validatePaymentDetails(payment, entity)) {
            throw this.createError(
                "Webhook payment details do not match our records.",
                409,
                "WEBHOOK_PAYMENT_MISMATCH"
            );
        }

        await prisma.paymentWebhookEvent.update({
            where: { id: webhookEvent.id },
            data: {
                paymentId: payment.id,
            },
        });

        // Never overwrite a successful or otherwise final payment.
        const updateResult = await prisma.payment.updateMany({
            where: {
                id: payment.id,
                status: {
                    in: [
                        PaymentStatus.CREATED,
                        PaymentStatus.PENDING,
                    ],
                },
            },
            data: {
                status: PaymentStatus.FAILED,
                failureCode: entity.error_code || "PAYMENT_FAILED",
                failureMessage:
                    entity.error_description ||
                    "Payment was not completed.",
            },
        });

        return {
            processed: true,
            eventType: webhookEvent.eventType,
            paymentId: payment.id,
            paymentMarkedFailed: updateResult.count === 1,
            message: "Payment failure event processed.",
        };
    }

    // =========================================================
    // FIND REFUND RECORD
    // =========================================================

    async findRefund(entity) {
        if (!entity || !entity.id || !entity.payment_id) {
            return null;
        }

        // First lookup: internal refund ID in Razorpay notes.
        const internalRefundId = entity.notes?.refundId;

        if (internalRefundId) {
            const refund = await prisma.paymentRefund.findUnique({
                where: {
                    id: internalRefundId,
                },
                include: {
                    payment: true,
                },
            });

            if (refund) {
                return refund;
            }
        }

        // Second lookup: Razorpay refund ID.
        const existingRefund = await prisma.paymentRefund.findUnique({
            where: {
                providerRefundId: entity.id,
            },
            include: {
                payment: true,
            },
        });

        if (existingRefund) {
            return existingRefund;
        }

        // Fallback: find one unambiguous pending refund.
        const payment = await prisma.payment.findFirst({
            where: {
                provider: PaymentProvider.RAZORPAY,
                providerPaymentId: entity.payment_id,
            },
        });

        if (!payment) {
            return null;
        }

        const refundAmount = new Prisma.Decimal(entity.amount).div(100);

        const pendingRefunds = await prisma.paymentRefund.findMany({
            where: {
                paymentId: payment.id,
                status: PaymentStatus.PENDING,
                amount: refundAmount,
            },
            include: {
                payment: true,
            },
            take: 2,
        });

        // Never guess if multiple pending refunds have the same amount.
        if (pendingRefunds.length !== 1) {
            return null;
        }

        return pendingRefunds[0];
    }

    // =========================================================
    // PROCESS RAZORPAY REFUND WEBHOOK
    // =========================================================

    async processRefundEvent({ webhookEvent, entity }) {
        if (
            !entity ||
            !entity.id ||
            !entity.payment_id ||
            !Number.isSafeInteger(entity.amount) ||
            entity.amount <= 0 ||
            !entity.currency
        ) {
            throw this.createError(
                "Refund details are missing or invalid.",
                400,
                "WEBHOOK_REFUND_ENTITY_INVALID"
            );
        }

        const refund = await this.findRefund(entity);

        if (!refund) {
            throw this.createError(
                "Matching internal refund record was not found.",
                503,
                "WEBHOOK_REFUND_NOT_FOUND"
            );
        }

        if (
            refund.payment.providerPaymentId !== entity.payment_id ||
            refund.currency !== entity.currency
        ) {
            throw this.createError(
                "Refund provider details do not match our records.",
                409,
                "WEBHOOK_REFUND_MISMATCH"
            );
        }

        const expectedAmount = Number(
            refund.amount.mul(100).toFixed(0)
        );

        if (expectedAmount !== entity.amount) {
            throw this.createError(
                "Refund amount does not match our records.",
                409,
                "WEBHOOK_REFUND_AMOUNT_MISMATCH"
            );
        }

        let targetRefundStatus;

        switch (webhookEvent.eventType) {
            case "refund.created":
                targetRefundStatus = PaymentStatus.PENDING;
                break;

            case "refund.processed":
                targetRefundStatus = PaymentStatus.REFUNDED;
                break;

            case "refund.failed":
                targetRefundStatus = PaymentStatus.FAILED;
                break;

            default:
                throw this.createError(
                    "Unsupported refund event.",
                    400,
                    "UNSUPPORTED_REFUND_EVENT"
                );
        }

        const result = await prisma.$transaction(async (tx) => {
            // Serialize refund updates for the same payment.
            await tx.$queryRaw`
                SELECT id
                FROM "Payment"
                WHERE id = ${refund.paymentId}::uuid
                FOR UPDATE
            `;

            const currentRefund = await tx.paymentRefund.findUnique({
                where: {
                    id: refund.id,
                },
            });

            if (!currentRefund) {
                throw this.createError(
                    "Refund record no longer exists.",
                    404,
                    "REFUND_NOT_FOUND"
                );
            }

            // Do not downgrade completed or failed refunds.
            let finalRefundStatus = currentRefund.status;

            if (
                currentRefund.status !== PaymentStatus.REFUNDED &&
                currentRefund.status !== PaymentStatus.FAILED
            ) {
                finalRefundStatus = targetRefundStatus;
            }

            const updateData = {
                providerRefundId: entity.id,
                status: finalRefundStatus,
            };

            if (finalRefundStatus === PaymentStatus.REFUNDED) {
                updateData.refundedAt =
                    currentRefund.refundedAt || new Date();
            }

            await tx.paymentRefund.update({
                where: {
                    id: currentRefund.id,
                },
                data: updateData,
            });

            // Link webhook event to payment.
            await tx.paymentWebhookEvent.update({
                where: {
                    id: webhookEvent.id,
                },
                data: {
                    paymentId: refund.paymentId,
                },
            });

            // Calculate completed refund total.
            const totals = await tx.paymentRefund.aggregate({
                where: {
                    paymentId: refund.paymentId,
                    status: PaymentStatus.REFUNDED,
                },
                _sum: {
                    amount: true,
                },
            });

            const currentPayment = await tx.payment.findUnique({
                where: {
                    id: refund.paymentId,
                },
            });

            if (!currentPayment) {
                throw this.createError(
                    "Associated payment record was not found.",
                    404,
                    "PAYMENT_NOT_FOUND"
                );
            }

            const refundedAmount =
                totals._sum.amount || new Prisma.Decimal(0);

            if (refundedAmount.gt(currentPayment.amountInclGst)) {
                throw this.createError(
                    "Total refunded amount exceeds the original payment amount.",
                    409,
                    "REFUND_TOTAL_EXCEEDS_PAYMENT"
                );
            }

            let paymentStatus = currentPayment.status;

            if (
                [
                    PaymentStatus.SUCCEEDED,
                    PaymentStatus.PARTIALLY_REFUNDED,
                    PaymentStatus.REFUNDED,
                ].includes(currentPayment.status)
            ) {
                if (refundedAmount.isZero()) {
                    paymentStatus = PaymentStatus.SUCCEEDED;
                } else if (
                    refundedAmount.gte(currentPayment.amountInclGst)
                ) {
                    paymentStatus = PaymentStatus.REFUNDED;
                } else {
                    paymentStatus = PaymentStatus.PARTIALLY_REFUNDED;
                }

                if (paymentStatus !== currentPayment.status) {
                    await tx.payment.update({
                        where: {
                            id: currentPayment.id,
                        },
                        data: {
                            status: paymentStatus,
                        },
                    });
                }
            }

            return {
                refundId: currentRefund.id,
                providerRefundId: entity.id,
                refundStatus: finalRefundStatus,
                paymentId: currentPayment.id,
                paymentStatus,
                totalRefunded: refundedAmount.toString(),
            };
        });

        return {
            processed: true,
            eventType: webhookEvent.eventType,
            ...result,
            message: "Refund webhook event processed successfully.",
        };
    }

    // =========================================================
    // WEBHOOK EVENT STATUS
    // =========================================================

    async markProcessed(webhookEventId) {
        await prisma.paymentWebhookEvent.update({
            where: { id: webhookEventId },
            data: {
                processedAt: new Date(),
                processingError: null,
            },
        });
    }

    async recordProcessingError(webhookEventId, error) {
        try {
            await prisma.paymentWebhookEvent.update({
                where: { id: webhookEventId },
                data: {
                    processingError: String(error.message).slice(0, 1000),
                },
            });
        } catch {
            // Preserve the original processing error.
        }
    }

    // =========================================================
    // MAIN WEBHOOK HANDLER
    // =========================================================

    async handleWebhookEvent({ eventId, event, rawBody }) {
        if (
            !eventId ||
            !event ||
            typeof event.event !== "string" ||
            !Buffer.isBuffer(rawBody)
        ) {
            throw this.createError(
                "Invalid webhook processing input.",
                400,
                "INVALID_WEBHOOK_INPUT"
            );
        }

        const payloadHash = this.hashPayload(rawBody);

        const webhookEvent = await this.saveWebhookEvent({
            eventId,
            eventType: event.event,
            payloadHash,
        });

        // A previously completed event must never be processed again.
        if (webhookEvent.processedAt) {
            return {
                processed: true,
                duplicate: true,
                eventType: webhookEvent.eventType,
                message: "Webhook event was already processed.",
            };
        }

        try {
            const paymentEntity = event.payload?.payment?.entity;
            const refundEntity = event.payload?.refund?.entity;

            let result;

            switch (event.event) {
                case "payment.captured":
                case "order.paid": {
                    if (!paymentEntity) {
                        throw this.createError(
                            "Payment details are missing from the webhook.",
                            400,
                            "WEBHOOK_PAYMENT_ENTITY_MISSING"
                        );
                    }

                    result = await this.processCapturedPayment({
                        webhookEvent,
                        entity: paymentEntity,
                    });

                    break;
                }

                case "payment.failed": {
                    if (!paymentEntity) {
                        throw this.createError(
                            "Payment details are missing from the webhook.",
                            400,
                            "WEBHOOK_PAYMENT_ENTITY_MISSING"
                        );
                    }

                    result = await this.processFailedPayment({
                        webhookEvent,
                        entity: paymentEntity,
                    });

                    break;
                }

                case "refund.created":
                case "refund.processed":
                case "refund.failed": {
                    if (!refundEntity) {
                        throw this.createError(
                            "Refund details are missing from the webhook.",
                            400,
                            "WEBHOOK_REFUND_ENTITY_MISSING"
                        );
                    }

                    result = await this.processRefundEvent({
                        webhookEvent,
                        entity: refundEntity,
                    });

                    break;
                }

                default: {
                    // Unsupported events are recorded but do not
                    // change payment or subscription state.
                    result = {
                        processed: true,
                        ignored: true,
                        eventType: event.event,
                        message: "Webhook event is not handled.",
                    };
                }
            }

            await this.markProcessed(webhookEvent.id);

            return result;
        } catch (error) {
            await this.recordProcessingError(
                webhookEvent.id,
                error
            );

            throw error;
        }
    }
}

module.exports = new PaymentWebhookService();
