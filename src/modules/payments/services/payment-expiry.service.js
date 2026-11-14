const { prisma } = require("../../../config/database");
const razorpay = require("../../../config/razorpay");

const {
    PaymentStatus,
    SubscriptionStatus,
} = require("@prisma/client");

const expirePendingPayments = async () => {
    const now = new Date();

    const expiredPayments = await prisma.payment.findMany({
        where: {
            status: {
                in: [
                    PaymentStatus.CREATED,
                    PaymentStatus.PENDING,
                ],
            },
            expiresAt: {
                lte: now,
            },
            subscription: {
                status: SubscriptionStatus.PENDING_PAYMENT,
            },
        },
        select: {
            id: true,
            subscriptionId: true,
            providerOrderId: true,
        },
    });

    let expiredCount = 0;
    let skippedCount = 0;

    for (const payment of expiredPayments) {
        try {
            // Verify payment status directly with Razorpay.
            if (payment.providerOrderId) {
                const providerPayments =
                    await razorpay.orders.fetchPayments(
                        payment.providerOrderId
                    );

                const hasCapturedPayment =
                    providerPayments.items?.some(
                        (item) => item.status === "captured"
                    );

                // Do not expire an order containing a captured payment.
                if (hasCapturedPayment) {
                    skippedCount++;
                    continue;
                }
            }

            const result = await prisma.$transaction(async (tx) => {
                const paymentUpdate = await tx.payment.updateMany({
                    where: {
                        id: payment.id,
                        status: {
                            in: [
                                PaymentStatus.CREATED,
                                PaymentStatus.PENDING,
                            ],
                        },
                        expiresAt: {
                            lte: new Date(),
                        },
                        subscription: {
                            status: SubscriptionStatus.PENDING_PAYMENT,
                        },
                    },
                    data: {
                        status: PaymentStatus.EXPIRED,
                        failureCode: "PAYMENT_TIMEOUT",
                        failureMessage:
                            "Payment expired after 15 minutes.",
                    },
                });

                if (paymentUpdate.count !== 1) {
                    return false;
                }

                await tx.subscription.updateMany({
                    where: {
                        id: payment.subscriptionId,
                        status: SubscriptionStatus.PENDING_PAYMENT,
                    },
                    data: {
                        status: SubscriptionStatus.EXPIRED,
                    },
                });

                return true;
            });

            if (result) {
                expiredCount++;
            }
        } catch (error) {
            // If Razorpay verification fails, do not expire the payment.
            skippedCount++;

            console.error(
                `[Payment Expiry] Could not verify payment ${payment.id}:`,
                error.message
            );
        }
    }

    return {
        expiredCount,
        skippedCount,
        message: "Payment expiry check completed.",
    };
};

module.exports = {
    expirePendingPayments,
};