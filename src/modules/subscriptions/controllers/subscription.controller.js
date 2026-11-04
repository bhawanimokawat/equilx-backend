const subscriptionService = require("../services/subscription.service");
const {
  subscriptionIdSchema,
  subscriptionHistoryQuerySchema,
} = require("../validation/subscription.validation");

const getMySubscription = async (req, res, next) => {
  try {
    const userId = req.user.id

    const subscription =
      await subscriptionService.getMySubscription(userId);

    return res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    return next(error);
  }
};

const getMySubscriptionHistory = async (req, res, next) => {
  try {
    const validation = subscriptionHistoryQuerySchema.safeParse(req.query);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters.",
        errors: validation.error.flatten(),
      });
    }

    const userId = req.user.id
    const { page, limit } = validation.data;

    const result =
      await subscriptionService.getMySubscriptionHistory(
        userId,
        page,
        limit
      );

    return res.status(200).json({
      success: true,
      data: result.subscriptions,
      pagination: result.pagination,
    });
  } catch (error) {
    return next(error);
  }
};

const getSubscriptionById = async (req, res, next) => {
  try {
    const validation = subscriptionIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription ID.",
      });
    }

    const userId = req.user.id
    const { subscriptionId } = validation.data;

    const subscription =
      await subscriptionService.getSubscriptionById(
        subscriptionId,
        userId
      );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    return next(error);
  }
};

const cancelSubscription = async (req, res, next) => {
  try {
    const validation = subscriptionIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription ID.",
      });
    }

    const { subscriptionId } = validation.data;
    const userId = req.user.id

    const subscription = await subscriptionService.cancelSubscription(
      subscriptionId,
      userId
    );

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Subscription cancellation scheduled. Your access will continue until the expiry date.",
      data: {
        id: subscription.id,
        status: subscription.status,
        cancelledAt: subscription.cancelledAt,
        endsAt: subscription.endsAt,
      },
    });
  } catch (error) {
    return next(error);
  }
};


const renewSubscription = async (req, res, next) => {
  try {
    const validation = subscriptionIdSchema.safeParse(req.params);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid subscription ID.",
      });
    }

    const { subscriptionId } = validation.data;
    const userId =req.user.id

    const idempotencyKey = req.headers["idempotency-key"];

    const normalizedIdempotencyKey =
      typeof idempotencyKey === "string"
        ? idempotencyKey.trim()
        : "";

    if (
      normalizedIdempotencyKey.length < 8 ||
      normalizedIdempotencyKey.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid Idempotency-Key header is required.",
      });
    }

    const renewal = await subscriptionService.renewSubscription({
      subscriptionId,
      userId,
      idempotencyKey: normalizedIdempotencyKey,
    });

    if (!renewal) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found.",
      });
    }

    return res.status(201).json({
      success: true,
      message:
        "Renewal payment order created. Complete payment to confirm renewal.",
      data: renewal,
    });
  } catch (error) {
    return next(error);
  }
};
module.exports = {
  getMySubscription,
  getMySubscriptionHistory,
  getSubscriptionById,
  cancelSubscription,
  renewSubscription,
};