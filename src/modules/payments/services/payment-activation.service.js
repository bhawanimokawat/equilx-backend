const { prisma } = require("../../../config/database");
const { createInvoice } = require("../../invoices/services/invoice-creation.service");

const {
  PaymentStatus,
  SubscriptionStatus,
} = require("@prisma/client");

const createError = (message, statusCode, code) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
};

// Adds calendar months without JavaScript month-end rollover errors.
// Example: January 31 + 1 month = February's final day.
const addMonthsSafely = (date, months) => {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() + months);

  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();

  result.setDate(Math.min(originalDay, lastDayOfTargetMonth));

  return result;
};

const activateSuccessfulPayment = async ({
  paymentId,
  providerPaymentId,
  changedByUserId = null,
}) => {
  if (!paymentId || !providerPaymentId) {
    throw createError(
      "Payment ID and provider payment ID are required.",
      400,
      "PAYMENT_ACTIVATION_INPUT_REQUIRED"
    );
  }

  return prisma.$transaction(
    async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          subscription: {
            include: {
              plan: true,
            },
          },
        },
      });

      if (!payment || !payment.subscription) {
        throw createError(
          "Payment or subscription not found.",
          404,
          "PAYMENT_NOT_FOUND"
        );
      }

      const subscription = payment.subscription;

      // Idempotent handling: a repeated verification or webhook
      // must not create another invoice or subscription activation.
      if (payment.status === PaymentStatus.SUCCEEDED) {
        if (payment.providerPaymentId !== providerPaymentId) {
          throw createError(
            "Payment was already completed with another provider payment ID.",
            409,
            "PAYMENT_ALREADY_VERIFIED"
          );
        }

        const existingInvoice = await tx.invoice.findUnique({
          where: { paymentId: payment.id },
        });

        if (!existingInvoice) {
          throw createError(
            "Successful payment is missing its invoice. Reconciliation is required.",
            500,
            "SUCCESSFUL_PAYMENT_INVOICE_MISSING"
          );
        }

        return {
          paymentId: payment.id,
          subscriptionId: subscription.id,
          paymentStatus: payment.status,
          subscriptionStatus: subscription.status,
          invoiceId: existingInvoice.id,
          invoiceNumber: existingInvoice.invoiceNumber,
          startsAt: subscription.startsAt,
          endsAt: subscription.endsAt,
          alreadyActivated: true,
        };
      }

      if (
        payment.status === PaymentStatus.REFUNDED ||
        payment.status === PaymentStatus.PARTIALLY_REFUNDED ||
        payment.status === PaymentStatus.FAILED
      ) {
        throw createError(
          "This payment cannot be activated.",
          409,
          "PAYMENT_NOT_ELIGIBLE_FOR_ACTIVATION"
        );
      }

      if (payment.status !== PaymentStatus.CREATED &&
          payment.status !== PaymentStatus.PENDING) {
        throw createError(
          "Payment is not in an activatable state.",
          409,
          "INVALID_PAYMENT_STATE"
        );
      }

      if (subscription.status !== SubscriptionStatus.PENDING_PAYMENT) {
        throw createError(
          "Subscription is not awaiting payment.",
          409,
          "INVALID_SUBSCRIPTION_STATE"
        );
      }

      const durationMonths = subscription.durationMonths;

      if (
        !Number.isInteger(durationMonths) ||
        durationMonths <= 0
      ) {
        throw createError(
          "Subscription duration is invalid.",
          500,
          "INVALID_SUBSCRIPTION_DURATION"
        );
      }

      // Confirm exactly one subscription owner.
      const hasUser = Boolean(subscription.userId);
      const hasInstitute = Boolean(subscription.instituteId);

      if (hasUser === hasInstitute) {
        throw createError(
          "Subscription must have exactly one owner.",
          409,
          "INVALID_SUBSCRIPTION_OWNER"
        );
      }

      const now = new Date();
      let startsAt = now;
      let changeType = "ACTIVATED";
      let previousSubscription = null;

      // Renewal handling.
      if (subscription.renewalOfSubscriptionId) {
        previousSubscription = await tx.subscription.findUnique({
          where: {
            id: subscription.renewalOfSubscriptionId,
          },
        });

        if (!previousSubscription) {
          throw createError(
            "Previous subscription was not found.",
            404,
            "RENEWAL_SOURCE_NOT_FOUND"
          );
        }

        // The renewal must belong to the same owner.
        const sameOwner =
          previousSubscription.userId === subscription.userId &&
          previousSubscription.instituteId === subscription.instituteId;

        if (!sameOwner) {
          throw createError(
            "Renewal subscription owner does not match.",
            409,
            "RENEWAL_OWNER_MISMATCH"
          );
        }

        if (
          previousSubscription.status !== SubscriptionStatus.ACTIVE ||
          !previousSubscription.endsAt
        ) {
          throw createError(
            "Previous subscription is no longer eligible for renewal.",
            409,
            "RENEWAL_SOURCE_NOT_AVAILABLE"
          );
        }

        // Start after the existing paid period when applicable.
        startsAt =
          previousSubscription.endsAt > now
            ? previousSubscription.endsAt
            : now;

        changeType = "RENEWED";
      }

      const endsAt = addMonthsSafely(startsAt, durationMonths);

      // Compare-and-set payment update protects against concurrent requests.
      const paymentUpdate = await tx.payment.updateMany({
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
          status: PaymentStatus.SUCCEEDED,
          providerPaymentId,
          paidAt: now,
        },
      });

      if (paymentUpdate.count !== 1) {
        throw createError(
          "Payment was modified by another request.",
          409,
          "PAYMENT_STATE_CONFLICT"
        );
      }

      // Activate subscription.
      const subscriptionUpdate = await tx.subscription.updateMany({
        where: {
          id: subscription.id,
          status: SubscriptionStatus.PENDING_PAYMENT,
        },
        data: {
          status: SubscriptionStatus.ACTIVE,
          startsAt,
          endsAt,
        },
      });

      if (subscriptionUpdate.count !== 1) {
        throw createError(
          "Subscription activation was modified by another request.",
          409,
          "SUBSCRIPTION_STATE_CONFLICT"
        );
      }

      // Save subscription history.
      await tx.subscriptionChange.create({
        data: {
          subscriptionId: subscription.id,
          changeType,
          previousStatus: SubscriptionStatus.PENDING_PAYMENT,
          newStatus: SubscriptionStatus.ACTIVE,
          changedByUserId,
          details: {
            paymentId: payment.id,
            providerPaymentId,
            renewalOfSubscriptionId:
              subscription.renewalOfSubscriptionId || null,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
          },
        },
      });

      // Create the invoice inside the same transaction.
      const invoice = await createInvoice({
        tx,
        paymentId: payment.id,
        subscriptionId: subscription.id,
      });

      return {
        paymentId: payment.id,
        subscriptionId: subscription.id,
        paymentStatus: PaymentStatus.SUCCEEDED,
        subscriptionStatus: SubscriptionStatus.ACTIVE,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        startsAt,
        endsAt,
        renewal: Boolean(subscription.renewalOfSubscriptionId),
        alreadyActivated: false,
      };
    },
    {
      maxWait: 5000,
      timeout: 15000,
    }
  );
};

module.exports = {
  activateSuccessfulPayment,
};
