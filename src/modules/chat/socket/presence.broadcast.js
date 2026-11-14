
const presenceService = require("../services/presence.service");

const {
  getUserActiveConversations,
} = require("./chat.authorization");

const { CHAT_EVENTS } = require("./chat.events");

// Notify active conversation participants about a user's presence.
async function broadcastUserPresence(io, userId, online) {
  const conversations = await getUserActiveConversations(userId);

  const event = online
    ? CHAT_EVENTS.USER_ONLINE
    : CHAT_EVENTS.USER_OFFLINE;

  for (const conversation of conversations) {
    const otherUserIds = [
      ...new Set(
        conversation.participants.map(
          (participant) => participant.userId
        )
      ),
    ];

    if (otherUserIds.length === 0) {
      continue;
    }

    const presencePayload = {
      userId,
      instituteId: conversation.instituteId,
      conversationId: conversation.id,
      online,
      timestamp: new Date().toISOString(),
    };

    for (const recipientId of otherUserIds) {
      io.to(`user:${recipientId}`).emit(event, presencePayload);
    }
  }
}

// Send existing participants' presence to a newly joined user.

async function sendConversationPresence(io, socket, conversation) {
  const userId = socket.data.user.id;

  const conversations = await getUserActiveConversations(userId);

  const activeConversation = conversations.find(
    (item) => item.id === conversation.id
  );

  if (!activeConversation) {
    return;
  }

  const otherUserIds = [
    ...new Set(
      activeConversation.participants.map(
        (participant) => participant.userId
      )
    ),
  ];

  const statuses = await presenceService.getUsersPresence(otherUserIds);

  socket.emit(CHAT_EVENTS.PRESENCE_SNAPSHOT, {
    conversationId: conversation.id,
    users: statuses,
  });
}


module.exports = {
  broadcastUserPresence,
  sendConversationPresence,
};
