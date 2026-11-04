
const crypto = require("crypto");

const { prisma } = require("../../../config/database");
const { activateSuccessfulPayment } = require("./payment-activation.service");

const { PaymentStatus, PaymentProvider } = require("@prisma/client");

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

        // Save the payment association before activation.
        await prisma.paymentWebhookEvent.update({
            where: { id: webhookEvent.id },
            data: {
                paymentId: payment.id,
            },
        });

        // This shared function activates the subscription and creates
        // the invoice atomically. It also supports duplicate activation.
        await activateSuccessfulPayment({
            paymentId: payment.id,
            providerPaymentId: entity.id,
            changedByUserId: null,
        });

        return {
            processed: true,
            eventType: webhookEvent.eventType,
            paymentId: payment.id,
            message: "Payment successfully activated.",
        };
    }

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
            const paymentEntity =
                event.payload?.payment?.entity;

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

                default: {
                    // Unsupported events are recorded but do not change
                    // payment or subscription state.
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
