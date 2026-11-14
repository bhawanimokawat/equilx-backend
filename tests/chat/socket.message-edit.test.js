
require("dotenv").config();

const { io } = require("socket.io-client");
const { randomUUID } = require("crypto");

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:5000";
const INSTITUTE_ID = process.env.TEST_INSTITUTE_ID;
const CONVERSATION_ID = process.env.TEST_CONVERSATION_ID;
const ADMIN_TOKEN = process.env.TEST_USER_A_TOKEN;
const STUDENT_TOKEN = process.env.TEST_USER_B_TOKEN;

const TIMEOUT = 5000;

function connectUser(token) {
  return new Promise((resolve, reject) => {
    const socket = io(API_ORIGIN, {
      auth: { token },
      transports: ["websocket"],
      reconnection: false,
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error("Socket connection timeout."));
    }, TIMEOUT);

    socket.once("connect", () => {
      clearTimeout(timer);
      resolve(socket);
    });

    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(error);
    });
  });
}

function emitWithAck(socket, eventName, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(TIMEOUT).emit(
      eventName,
      payload,
      (error, response) => {
        if (error) return reject(error);
        resolve(response);
      }
    );
  });
}

function waitForEvent(socket, eventName, timeout = TIMEOUT) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(eventName, handler);
      reject(new Error(`Timeout waiting for ${eventName}.`));
    }, timeout);

    function handler(payload) {
      clearTimeout(timer);
      resolve(payload);
    }

    socket.once(eventName, handler);
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }

  console.log(`[PASS] ${message}`);
}

async function run() {
  let adminSocket;
  let studentSocket;

  try {
    if (!INSTITUTE_ID || !CONVERSATION_ID || !ADMIN_TOKEN || !STUDENT_TOKEN) {
      throw new Error("Required test environment variables are missing.");
    }

    console.log("\nStarting message edit tests...\n");

    adminSocket = await connectUser(ADMIN_TOKEN);
    assert(adminSocket.connected, "Institute Admin connected.");

    studentSocket = await connectUser(STUDENT_TOKEN);
    assert(studentSocket.connected, "Student connected.");

    const joinPayload = {
      instituteId: INSTITUTE_ID,
      conversationId: CONVERSATION_ID,
    };

    const adminJoin = await emitWithAck(
      adminSocket,
      "chat:join",
      joinPayload
    );

    assert(adminJoin?.success === true, "Admin joined the conversation.");

    const studentJoin = await emitWithAck(
      studentSocket,
      "chat:join",
      joinPayload
    );

    assert(studentJoin?.success === true, "Student joined the conversation.");

    const originalContent = `Original message ${randomUUID()}`;
    const updatedContent = `Updated message ${randomUUID()}`;

    const newMessageEvent = waitForEvent(studentSocket, "message:new");

    const sendResponse = await emitWithAck(
      adminSocket,
      "message:send",
      {
        ...joinPayload,
        content: originalContent,
        clientMessageId: randomUUID(),
      }
    );

    assert(sendResponse?.success === true, "Original message created.");

    const messageId = sendResponse.data.id;

    assert(Boolean(messageId), "Original message ID received.");

    const receivedMessage = await newMessageEvent;

    assert(
      receivedMessage?.data?.id === messageId,
      "Student received the original message."
    );

    const updatedEventPromise = waitForEvent(
      studentSocket,
      "message:updated"
    );

    const editResponse = await emitWithAck(
      adminSocket,
      "message:edit",
      {
        ...joinPayload,
        messageId,
        content: updatedContent,
      }
    );

    assert(editResponse?.success === true, "Message edit acknowledged.");

    assert(
      editResponse.data.id === messageId,
      "Edited message ID matches original."
    );

    assert(
      editResponse.data.content === updatedContent,
      "Acknowledgement contains updated content."
    );

    const updatedEvent = await updatedEventPromise;

    assert(
      updatedEvent?.data?.id === messageId,
      "Student received message:updated."
    );

    assert(
      updatedEvent.data.content === updatedContent,
      "Student received updated message content."
    );

    console.log("\n======================================");
    console.log("[PASS] Message edit tests completed.");
    console.log("======================================\n");
  } catch (error) {
    console.error("\n[FAIL]", error.message);
    process.exitCode = 1;
  } finally {
    if (adminSocket) adminSocket.disconnect();
    if (studentSocket) studentSocket.disconnect();
  }
}

run();
