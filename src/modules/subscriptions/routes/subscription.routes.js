const express = require("express");


const { requireAuth } = require("../../../middleware/auth.middleware");
const subscriptionController = require("../controllers/subscription.controller");


const router = express.Router();

// Get current user's active personal subscription
router.get("/me", requireAuth, subscriptionController.getMySubscription);

// Get current user's personal subscription history
router.get( "/history", requireAuth, subscriptionController.getMySubscriptionHistory);

// Get a specific personal subscription
router.get("/:subscriptionId",requireAuth,subscriptionController.getSubscriptionById);

router.post( "/:subscriptionId/cancel", requireAuth, subscriptionController.cancelSubscription);
router.post("/:subscriptionId/renew",requireAuth,subscriptionController.renewSubscription);

module.exports = router;