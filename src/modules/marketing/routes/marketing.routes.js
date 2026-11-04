const express = require("express");
const { requireAuth } = require("../../../middleware/auth.middleware");

const {
  updateMarketingPreferences,
  unsubscribe,
} = require("../controllers/marketing.controller");

const router = express.Router();

// Authenticated student consent endpoint.
router.patch("/preferences", requireAuth, updateMarketingPreferences);

// Public unsubscribe link.
router.get("/unsubscribe", unsubscribe);

module.exports = router;