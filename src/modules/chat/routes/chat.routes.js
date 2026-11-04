const express = require("express");

const conversationController = require("../controllers/conversation.controller");
const messageController = require("../controllers/message.controller");

const { requireAuth } = require("../../../middleware/auth.middleware");
const { validate } = require("../../../middleware/validate.middleware");

const {
  createDirectConversationSchema,
  createGroupConversationSchema,
  listConversationsSchema,
  conversationIdSchema,
  updateConversationSchema,
  addParticipantsSchema,
  removeParticipantSchema,
  listMessagesSchema,
  editMessageSchema,
  deleteMessageSchema,
  markConversationReadSchema,
  sendMessageSchema,
} = require("../validations/chat.validation");
const router = express.Router();

router.use(requireAuth);

// 1. Create direct conversation
router.post(  "/:instituteId/conversations/direct",  validate(createDirectConversationSchema),  conversationController.createDirectConversation);

// 2. Create institute or batch group
router.post("/:instituteId/conversations/groups",validate(createGroupConversationSchema),conversationController.createGroupConversation);

// 3. List conversations
router.get( "/:instituteId/conversations", validate(listConversationsSchema), conversationController.listConversations);

// 4. Get conversation details
router.get("/:instituteId/conversations/:conversationId",validate(conversationIdSchema),conversationController.getConversationById);

// 5. Update conversation
router.patch("/:instituteId/conversations/:conversationId", validate(updateConversationSchema), conversationController.updateConversation);

// 6. Add participants
router.post("/:instituteId/conversations/:conversationId/participants",validate(addParticipantsSchema),conversationController.addParticipants);

// 7. Remove participant
router.delete("/:instituteId/conversations/:conversationId/participants/:userId",validate(removeParticipantSchema),conversationController.removeParticipant);

// 8. Archive conversation
router.post( "/:instituteId/conversations/:conversationId/archive", validate(conversationIdSchema), conversationController.archiveConversation);




// Message routes
// Send a message
router.post( "/:instituteId/conversations/:conversationId/messages", validate(sendMessageSchema), messageController.sendMessage);
// List conversation messages
router.get("/:instituteId/conversations/:conversationId/messages",validate(listMessagesSchema),messageController.listMessages);

// Edit a message
router.patch( "/:instituteId/conversations/:conversationId/messages/:messageId", validate(editMessageSchema), messageController.editMessage);

// Delete a message
router.delete("/:instituteId/conversations/:conversationId/messages/:messageId",validate(deleteMessageSchema),messageController.deleteMessage);

// Mark conversation as read
router.post("/:instituteId/conversations/:conversationId/read",validate(markConversationReadSchema),messageController.markConversationRead);


module.exports = router;
