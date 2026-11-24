
const supportChatService = require(
  "../services/support-chat.service"
);

async function createConversation(req, res, next) {
  try {
    const conversation =
      await supportChatService.createConversation(
        req.user,
        req.body
      );

    return res.status(201).json({
      success: true,
      message: "Support conversation created.",
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
}

async function listConversations(req, res, next) {
  try {
    const data =
      await supportChatService.listConversations(
        req.user,
        req.query
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function getConversation(req, res, next) {
  try {
    const conversation =
      await supportChatService.getConversation(
        req.user,
        req.params.conversationId
      );

    return res.status(200).json({
      success: true,
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
}

async function listMessages(req, res, next) {
  try {
    const data =
      await supportChatService.listMessages(
        req.user,
        req.params.conversationId,
        req.query
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

async function sendMessage(req, res, next) {
  try {
    const message =
      await supportChatService.sendMessage(
        req.user,
        req.params.conversationId,
        req.body
      );

    return res.status(201).json({
      success: true,
      message: "Support message sent.",
      data: { message },
    });
  } catch (error) {
    next(error);
  }
}

async function closeConversation(req, res, next) {
  try {
    const conversation =
      await supportChatService.closeConversation(
        req.user,
        req.params.conversationId
      );

    return res.status(200).json({
      success: true,
      message: "Support conversation closed.",
      data: { conversation },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createConversation,
  listConversations,
  getConversation,
  listMessages,
  sendMessage,
  closeConversation,
};
