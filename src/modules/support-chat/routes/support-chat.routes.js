
const express = require("express");

const { requireAuth } = require(
  "../../../middleware/auth.middleware"
);

const controller = require(
  "../controllers/support-chat.controller"
);

const router = express.Router();

// Every support-chat request requires login.
router.use(requireAuth);

// List conversations.
// Individual Student: own conversations.
// Super Admin: all conversations.
router.get(
  "/conversations",
  controller.listConversations
);

// Create a support conversation.
// Only Individual Students.
router.post(
  "/conversations",
  controller.createConversation
);

// Get a single authorized conversation.
router.get(
  "/conversations/:conversationId",
  controller.getConversation
);

// Read messages from an authorized conversation.
router.get(
  "/conversations/:conversationId/messages",
  controller.listMessages
);

// Send a message to an authorized conversation.
router.post(
  "/conversations/:conversationId/messages",
  controller.sendMessage
);

// Close conversation.
// Only Super Admin.
router.patch(
  "/conversations/:conversationId/close",
  controller.closeConversation
);

module.exports = router;
