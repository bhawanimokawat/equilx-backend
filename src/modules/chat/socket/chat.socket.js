
const { CHAT_EVENTS } = require("./chat.events");
const { authorizeConversationRoom, } = require("./chat.authorization");
const messageService = require("../services/message.service");
const { sendMessageSchema, editMessageSchema, deleteMessageSchema, markConversationReadSchema } = require("../validations/chat.validation");
const presenceService = require("../services/presence.service");
const {
  broadcastUserPresence,
  sendConversationPresence,
} = require("./presence.broadcast");

// UUID validation
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value) {
  return typeof value === "string" && UUID_REGEX.test(value);
}

// Generate a unique room for each institute conversation
function getConversationRoom(instituteId, conversationId) {
  return `institute:${instituteId}:conversation:${conversationId}`;
}

// Send a safe error response
function sendSocketError(socket, message, ack) {
  const response = {
    success: false,
    message,
  };

  if (typeof ack === "function") {
    return ack(response);
  }

  socket.emit(CHAT_EVENTS.ERROR, response);
}

function registerChatSocketHandlers(io) {
  io.on(CHAT_EVENTS.CONNECTION, (socket) => {
    const userId = socket.data.user.id;


    // Register this socket as an active connection.
    // Register socket and join the user's private room.
    const presenceReady = (async () => {
      const count = await presenceService.addSocket(userId, socket.id);

      await socket.join(`user:${userId}`);

      // Notify conversation participants only on the first connection.
      if (count === 1) {
        await broadcastUserPresence(io, userId, true);
      }

      return count;
    })().catch((error) => {
      console.error("[CHAT] Presence registration failed:", error);
      return null;
    });

    // Refresh presence every 30 seconds.
    const presenceInterval = setInterval(async () => {
      try {
        const registered = await presenceReady;

        if (registered !== null) {
          await presenceService.refreshSocket(userId, socket.id);
        }
      } catch (error) {
        console.error("[CHAT] Presence refresh failed:", error);
      }
    }, 30000);

    presenceInterval.unref?.();
    // Join conversation room
    socket.on(CHAT_EVENTS.JOIN_CONVERSATION, async (payload = {}, ack) => {
      try {
        const { instituteId, conversationId } = payload;

        if (
          !isValidUUID(instituteId) ||
          !isValidUUID(conversationId)
        ) {
          return sendSocketError(
            socket,
            "Invalid conversation details.",
            ack
          );
        }

        // Verify user authorization before joining
        const conversation = await authorizeConversationRoom({
          userId,
          instituteId,
          conversationId,
        });

        const room = getConversationRoom(
          conversation.instituteId,
          conversation.id
        );

        await socket.join(room);

        // Send the current online status of other participants.
        await sendConversationPresence(io, socket, conversation);

        const response = {
          success: true,
          conversationId: conversation.id,
          message: "Joined conversation successfully.",
        };

        if (typeof ack === "function") {
          return ack(response);
        }

        socket.emit(CHAT_EVENTS.JOIN_CONVERSATION, response);
      } catch (error) {
        console.error("[CHAT] Join conversation failed:", error);

        sendSocketError(
          socket,
          "Unable to join conversation.",
          ack
        );
      }
    });

    // Leave conversation room
    socket.on(CHAT_EVENTS.LEAVE_CONVERSATION, async (payload = {}, ack) => {
      try {
        const { instituteId, conversationId } = payload;

        if (
          !isValidUUID(instituteId) ||
          !isValidUUID(conversationId)
        ) {
          return sendSocketError(
            socket,
            "Invalid conversation details.",
            ack
          );
        }

        const room = getConversationRoom(
          instituteId,
          conversationId
        );

        await socket.leave(room);

        const response = {
          success: true,
          conversationId,
          message: "Left conversation successfully.",
        };

        if (typeof ack === "function") {
          return ack(response);
        }

        socket.emit(CHAT_EVENTS.LEAVE_CONVERSATION, response);
      } catch (error) {
        console.error("[CHAT] Leave conversation failed:", error);

        sendSocketError(
          socket,
          "Unable to leave conversation.",
          ack
        );
      }
    });


    // Send a real-time message
socket.on(CHAT_EVENTS.SEND_MESSAGE, async (payload = {}, ack) => {
  try {
    const validation = sendMessageSchema.safeParse({
      params: {
        instituteId: payload.instituteId,
        conversationId: payload.conversationId,
      },
      body: {
        content: payload.content,
        clientMessageId: payload.clientMessageId,
      },
    });

    if (!validation.success) {
      return sendSocketError(
        socket,
        "Invalid message data.",
        ack
      );
    }

    const { instituteId, conversationId } = validation.data.params;
    const { content, clientMessageId } = validation.data.body;

    // Save message using existing service
    const result = await messageService.sendMessage({
      userId,
      instituteId,
      conversationId,
      content,
      clientMessageId,
    });

    // Convert BigInt values before Socket.IO serialization
    const safeMessage = JSON.parse(
      JSON.stringify(result.message, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    const room = getConversationRoom(
      instituteId,
      conversationId
    );

    // Broadcast only when the message is newly created
    if (result.isNew) {
      socket.to(room).emit(CHAT_EVENTS.NEW_MESSAGE, {
        success: true,
        data: safeMessage,
      });
    }

    // Confirm saved message to sender
    const response = {
      success: true,
      message: "Message sent successfully.",
      data: safeMessage,
    };

    if (typeof ack === "function") {
      return ack(response);
    }

    // Notify sender only for a newly created message
    if (result.isNew) {
      socket.emit(CHAT_EVENTS.NEW_MESSAGE, response);
    }

  } catch (error) {
    console.error("[CHAT] Send message failed:", error);

    sendSocketError(
      socket,
      "Unable to send message.",
      ack
    );
  }
});


    // Edit an existing message in real time
    socket.on(CHAT_EVENTS.EDIT_MESSAGE, async (payload = {}, ack) => {
      try {
        const validation = editMessageSchema.safeParse({
          params: {
            instituteId: payload.instituteId,
            conversationId: payload.conversationId,
            messageId: payload.messageId,
          },
          body: {
            content: payload.content,
          },
        });

        if (!validation.success) {
          return sendSocketError(
            socket,
            "Invalid message edit data.",
            ack
          );
        }

        const {
          instituteId,
          conversationId,
          messageId,
        } = validation.data.params;

        const { content } = validation.data.body;

        // Update message using existing service
        const message = await messageService.editMessage({
          userId,
          instituteId,
          conversationId,
          messageId,
          content,
        });

        // Safely serialize BigInt values
        const safeMessage = JSON.parse(
          JSON.stringify(message, (key, value) =>
            typeof value === "bigint" ? value.toString() : value
          )
        );

        const room = getConversationRoom(
          instituteId,
          conversationId
        );

        // Notify other conversation participants
        socket.to(room).emit(CHAT_EVENTS.MESSAGE_UPDATED, {
          success: true,
          data: safeMessage,
        });

        const response = {
          success: true,
          message: "Message updated successfully.",
          data: safeMessage,
        };

        if (typeof ack === "function") {
          return ack(response);
        }

        socket.emit(CHAT_EVENTS.MESSAGE_UPDATED, response);

      } catch (error) {
        console.error("[CHAT] Edit message failed:", error);

        sendSocketError(
          socket,
          "Unable to edit message.",
          ack
        );
      }
    });

    // Delete an existing message in real time
    socket.on(CHAT_EVENTS.DELETE_MESSAGE, async (payload = {}, ack) => {
      try {
        const validation = deleteMessageSchema.safeParse({
          params: {
            instituteId: payload.instituteId,
            conversationId: payload.conversationId,
            messageId: payload.messageId,
          },
        });

        if (!validation.success) {
          return sendSocketError(
            socket,
            "Invalid message deletion data.",
            ack
          );
        }

        const {
          instituteId,
          conversationId,
          messageId,
        } = validation.data.params;

        // Delete using the existing service
        const deletedMessage = await messageService.deleteMessage({
          userId,
          instituteId,
          conversationId,
          messageId,
        });

        const room = getConversationRoom(
          instituteId,
          conversationId
        );

        const response = {
          success: true,
          message: "Message deleted successfully.",
          data: deletedMessage,
        };

        // Notify other conversation participants
        socket.to(room).emit(CHAT_EVENTS.MESSAGE_DELETED, response);

        // Confirm deletion to sender
        if (typeof ack === "function") {
          return ack(response);
        }

        socket.emit(CHAT_EVENTS.MESSAGE_DELETED, response);

      } catch (error) {
        console.error("[CHAT] Delete message failed:", error);

        sendSocketError(
          socket,
          "Unable to delete message.",
          ack
        );
      }
    });



    // Mark conversation messages as read in real time
    socket.on(CHAT_EVENTS.MARK_READ, async (payload = {}, ack) => {
      try {
        const validation = markConversationReadSchema.safeParse({
          params: {
            instituteId: payload.instituteId,
            conversationId: payload.conversationId,
          },
          body: {
            lastMessageId: payload.lastMessageId,
          },
        });

        if (!validation.success) {
          return sendSocketError(
            socket,
            "Invalid read receipt data.",
            ack
          );
        }

        const { instituteId, conversationId } =
          validation.data.params;

        const { lastMessageId } = validation.data.body;

        // Update read status in PostgreSQL
        const readReceipt = await messageService.markConversationRead({
          userId,
          instituteId,
          conversationId,
          lastMessageId,
        });

        const response = {
          success: true,
          message: "Messages marked as read.",
          data: {
            conversationId: readReceipt.conversationId,
            userId: readReceipt.userId,
            lastReadAt: readReceipt.lastReadAt,
          },
        };

        const room = getConversationRoom(
          instituteId,
          conversationId
        );

        // Notify other conversation participants
        socket.to(room).emit(CHAT_EVENTS.READ_UPDATE, response);

        // Confirm to the current participant
        if (typeof ack === "function") {
          return ack(response);
        }

        socket.emit(CHAT_EVENTS.READ_UPDATE, response);

      } catch (error) {
        console.error("[CHAT] Mark read failed:", error);

        sendSocketError(
          socket,
          "Unable to mark messages as read.",
          ack
        );
      }
    });


    // Handle typing start and stop events
    async function handleTypingEvent(payload, eventName, ack) {
      try {
        const { instituteId, conversationId } = payload || {};

        if (
          !isValidUUID(instituteId) ||
          !isValidUUID(conversationId)
        ) {
          return sendSocketError(
            socket,
            "Invalid conversation details.",
            ack
          );
        }

        // Verify conversation access before broadcasting
        const conversation = await authorizeConversationRoom({
          userId,
          instituteId,
          conversationId,
        });

        const room = getConversationRoom(
          conversation.instituteId,
          conversation.id
        );

        const response = {
          success: true,
          data: {
            conversationId: conversation.id,
            userId,
          },
        };

        // Notify other participants
        socket.to(room).emit(eventName, response);

        if (typeof ack === "function") {
          return ack(response);
        }
      } catch (error) {
        console.error("[CHAT] Typing event failed:", error);

        sendSocketError(
          socket,
          "Unable to process typing event.",
          ack
        );
      }
    }

    // User started typing
    socket.on(CHAT_EVENTS.TYPING_START, (payload = {}, ack) => {
      return handleTypingEvent(
        payload,
        CHAT_EVENTS.TYPING_START,
        ack
      );
    });

    // User stopped typing
    socket.on(CHAT_EVENTS.TYPING_STOP, (payload = {}, ack) => {
      return handleTypingEvent(
        payload,
        CHAT_EVENTS.TYPING_STOP,
        ack
      );
    });



    // Handle disconnection.
    socket.on(CHAT_EVENTS.DISCONNECT, async (reason) => {
      clearInterval(presenceInterval);

      try {
        const registered = await presenceReady;

        if (registered === null) {
          return;
        }

        const remainingSockets = await presenceService.removeSocket(
          userId,
          socket.id
        );

        // Notify participants only when the last socket disconnects.
        if (remainingSockets === 0) {
          await broadcastUserPresence(io, userId, false);
        }

        console.info(
          `[CHAT] User disconnected: ${userId}, reason: ${reason}`
        );
      } catch (error) {
        console.error("[CHAT] Presence cleanup failed:", error);
      }
    });


  });
}



module.exports = { registerChatSocketHandlers };
