const { prisma } = require("../../../config/database");
const paymentService = require("../../payments/services/payment.service");

const getMySubscription = async (userId) => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      userId,
      instituteId: null,
      status: "ACTIVE",
      endsAt: {
        gt: new Date(),
      },
    },
    include: {
      plan: true,
      planVersion: true,
    },
    orderBy: {
      endsAt: "desc",
    },
  });

  return subscription;
};

const getMySubscriptionHistory = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;

  const [subscriptions, total] = await prisma.$transaction([
    prisma.subscription.findMany({
      where: {
        userId,
        instituteId: null,
      },
      include: {
        plan: true,
        planVersion: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: limit,
    }),

    prisma.subscription.count({
      where: {
        userId,
        instituteId: null,
      },
    }),
  ]);

  return {
    subscriptions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const getSubscriptionById = async (subscriptionId, userId) => {
  return prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      userId,
      instituteId: null,
    },
    include: {
      plan: true,
      planVersion: true,
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
      invoices: true,
    },
  });
};

const cancelSubscription = async (subscriptionId, userId) => {
  const subscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      userId,
      instituteId: null,
    },
  });

  if (!subscription) {
    return null;
  }

  const now = new Date();

  if (
    subscription.status !== "ACTIVE" ||
    !subscription.endsAt ||
    subscription.endsAt <= now
  ) {
    const error = new Error("Only active subscriptions can be cancelled.");
    error.statusCode = 400;
    error.code = "SUBSCRIPTION_NOT_CANCELLABLE";
    throw error;
  }

  // Idempotent: repeated cancellation requests do not change the date.
  if (subscription.cancelledAt) {
    return subscription;
  }

  return prisma.subscription.update({
    where: {
      id: subscriptionId,
    },
    data: {
      cancelledAt: now,
    },
  });
};

const renewSubscription = async ({
  subscriptionId,
  userId,
  idempotencyKey,
}) => {
  const normalizedIdempotencyKey =
    typeof idempotencyKey === "string" ? idempotencyKey.trim() : "";

  if (
    normalizedIdempotencyKey.length < 8 ||
    normalizedIdempotencyKey.length > 128
  ) {
    const error = new Error(
      "Idempotency key must be between 8 and 128 characters."
    );
    error.statusCode = 400;
    error.code = "INVALID_IDEMPOTENCY_KEY";
    throw error;
  }
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      id: subscriptionId,
      userId,
      instituteId: null,
    },
    include: {
      plan: true,
      planVersion: true,
    },
  });

  if (!existingSubscription) {
    return null;
  }

  const now = new Date();

  if (
    existingSubscription.status !== "ACTIVE" ||
    !existingSubscription.endsAt ||
    existingSubscription.endsAt <= now
  ) {
    const error = new Error(
      "Only an active, unexpired subscription can be renewed."
    );
    error.statusCode = 400;
    error.code = "SUBSCRIPTION_NOT_RENEWABLE";
    throw error;
  }

  // Prevent another pending renewal with a different idempotency key.
  const pendingRenewal = await prisma.subscription.findFirst({
    where: {
      renewalOfSubscriptionId: existingSubscription.id,
      userId,
      instituteId: null,
      status: "PENDING_PAYMENT",
      payments: {
        none: {
          idempotencyKey: normalizedIdempotencyKey,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (pendingRenewal) {
    const error = new Error(
      "A renewal payment is already pending for this subscription."
    );
    error.statusCode = 409;
    error.code = "RENEWAL_ALREADY_PENDING";
    throw error;
  }

  // Reuse the existing plan version and Razorpay order-creation flow.
  const payment = await paymentService.createOrder({
    planVersionId: existingSubscription.planVersionId,
    userId,
    idempotencyKey,
    renewalOfSubscriptionId: existingSubscription.id,
  });

  return {
    ...payment,
    renewalOfSubscriptionId: existingSubscription.id,
    scheduledStartAt: existingSubscription.endsAt,
  };
};

module.exports = {
  getMySubscription,
  getMySubscriptionHistory,
  getSubscriptionById,
  cancelSubscription,
  renewSubscription,
};