
const conversationService = require("../services/conversation.service");

// 1. Create direct conversation
async function createDirectConversation(req, res, next) {
  try {
    const { params, body } = req.validated;

    const result = await conversationService.createDirectConversation({
      userId: req.user.id,
      instituteId: params.instituteId,
      recipientUserId: body.recipientUserId,
    });

    return res.status(201).json({
      success: true,
      message: "Direct conversation created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 2. Create institute or batch group
async function createGroupConversation(req, res, next) {
  try {
    const { params, body } = req.validated;

    const result = await conversationService.createGroupConversation({
      userId: req.user.id,
      instituteId: params.instituteId,
      title: body.title,
      batchId: body.batchId,
      participantIds: body.participantIds,
    });

    return res.status(201).json({
      success: true,
      message: "Group conversation created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 3. List conversations
async function listConversations(req, res, next) {
  try {
    const { params, query } = req.validated;

    const result = await conversationService.listConversations({
      userId: req.user.id,
      instituteId: params.instituteId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 4. Get conversation details
async function getConversationById(req, res, next) {
  try {
    const { params } = req.validated;

    const result = await conversationService.getConversationById({
      userId: req.user.id,
      instituteId: params.instituteId,
      conversationId: params.conversationId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 5. Update conversation
async function updateConversation(req, res, next) {
  try {
    const { params, body } = req.validated;

    const result = await conversationService.updateConversation({
      userId: req.user.id,
      instituteId: params.instituteId,
      conversationId: params.conversationId,
      title: body.title,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 6. Add participants
async function addParticipants(req, res, next) {
  try {
    const { params, body } = req.validated;

    const result = await conversationService.addParticipants({
      userId: req.user.id,
      instituteId: params.instituteId,
      conversationId: params.conversationId,
      userIds: body.userIds,
    });

    return res.status(200).json({
      success: true,
      message: "Participants processed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 7. Remove participant
async function removeParticipant(req, res, next) {
  try {
    const { params } = req.validated;

    const result = await conversationService.removeParticipant({
      userId: req.user.id,
      instituteId: params.instituteId,
      conversationId: params.conversationId,
      targetUserId: params.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Participant removed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 8. Archive conversation
async function archiveConversation(req, res, next) {
  try {
    const { params } = req.validated;

    const result = await conversationService.archiveConversation({
      userId: req.user.id,
      instituteId: params.instituteId,
      conversationId: params.conversationId,
    });

    return res.status(200).json({
      success: true,
      message: "Conversation archived successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createDirectConversation,
  createGroupConversation,
  listConversations,
  getConversationById,
  updateConversation,
  addParticipants,
  removeParticipant,
  archiveConversation,
};
