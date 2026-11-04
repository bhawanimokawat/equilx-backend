
const { CHAT_EVENTS } = require("./chat.events");
const {authorizeConversationRoom,} = require("./chat.authorization");
const messageService = require("../services/message.service");
const { sendMessageSchema ,editMessageSchema} = require("../validations/chat.validation");

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

    console.info(`[CHAT] User connected: ${userId}`);

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
    const message = await messageService.sendMessage({
      userId,
      instituteId,
      conversationId,
      content,
      clientMessageId,
    });

    // Convert BigInt values before Socket.IO serialization
    const safeMessage = JSON.parse(
      JSON.stringify(message, (key, value) =>
        typeof value === "bigint" ? value.toString() : value
      )
    );

    const room = getConversationRoom(
      instituteId,
      conversationId
    );


    
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


    // Send message to other conversation participants
    socket.to(room).emit(CHAT_EVENTS.NEW_MESSAGE, {
      success: true,
      data: safeMessage,
    });

    // Confirm saved message to sender
    const response = {
      success: true,
      message: "Message sent successfully.",
      data: safeMessage,
    };

    if (typeof ack === "function") {
      return ack(response);
    }

    socket.emit(CHAT_EVENTS.NEW_MESSAGE, response);

  } catch (error) {
    console.error("[CHAT] Send message failed:", error);

    sendSocketError(
      socket,
      "Unable to send message.",
      ack
    );
  }
});


    // Handle disconnection
    socket.on(CHAT_EVENTS.DISCONNECT, (reason) => {
      console.info(
        `[CHAT] User disconnected: ${userId}, reason: ${reason}`
      );
    });
  });
}

module.exports = { registerChatSocketHandlers };
