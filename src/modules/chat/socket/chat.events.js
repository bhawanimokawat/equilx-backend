const CHAT_EVENTS = Object.freeze({
  // Connection
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

  // Conversation rooms
  JOIN_CONVERSATION: "chat:join",
  LEAVE_CONVERSATION: "chat:leave",

  // Messages
  SEND_MESSAGE: "message:send",
  NEW_MESSAGE: "message:new",
  EDIT_MESSAGE: "message:edit",
  MESSAGE_UPDATED: "message:updated",
  DELETE_MESSAGE: "message:delete",
  MESSAGE_DELETED: "message:deleted",

  // Typing
  TYPING_START: "typing:start",
  TYPING_STOP: "typing:stop",

  // Read receipts
  MARK_READ: "message:read",
  READ_UPDATE: "message:read_update",

  // Presence
  USER_ONLINE: "presence:online",
  USER_OFFLINE: "presence:offline",

  // Errors
  ERROR: "chat:error",


  PRESENCE_SNAPSHOT: "presence:snapshot",
});

module.exports = { CHAT_EVENTS };
