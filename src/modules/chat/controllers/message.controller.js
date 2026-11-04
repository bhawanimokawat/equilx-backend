
const messageService = require("../services/message.service");

// 1. List messages
async function listMessages(req, res, next) {
  try {
    const { params, query } = req.validated;

    const result = await messageService.listMessages({
      userId: req.user.id,
      instituteId: params.instituteId,
      conversationId: params.conversationId,
      limit: query.limit,
      beforeId: query.beforeId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 2. Edit message
async function editMessage(req, res, next) {
  try {
    const { params, body } = req.validated;

    const result = await messageService.editMessage({
      userId: req.user.id,
      instituteId: params.instituteId,
      conversationId: params.conversationId,
      messageId: params.messageId,
      content: body.content,
    });

    return res.status(200).json({
      success: true,
      message: "Message updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 3. Delete message
async function deleteMessage(req, res, next) {
  try {
    const { params } = req.validated;

    const result = await messageService.deleteMessage({
      userId: req.user.id,
      instituteId: params.instituteId,
      conversationId: params.conversationId,
      messageId: params.messageId,
    });

    return res.status(200).json({
      success: true,
      message: "Message deleted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 4. Mark conversation as read
async function markConversationRead(req, res, next) {
  try {
    const { params, body } = req.validated;

    const result = await messageService.markConversationRead({
      userId: req.user.id,
      instituteId: params.instituteId,
      conversationId: params.conversationId,
      lastMessageId: body.lastMessageId,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation marked as read.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const result = await messageService.sendMessage({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      conversationId: req.params.conversationId,
      content: req.body.content,
      clientMessageId: req.body.clientMessageId,
    });

    return res.status(201).json({
      success: true,
      message: "Message sent successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listMessages,
  editMessage,
  deleteMessage,
  markConversationRead,
  sendMessage,
};
