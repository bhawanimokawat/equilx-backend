
require("dotenv").config();

const assert = require("node:assert/strict");
const { io } = require("socket.io-client");
const { randomUUID } = require("node:crypto");

const API_ORIGIN =
    process.env.API_ORIGIN || "http://localhost:5000";

const INSTITUTE_ID = process.env.TEST_INSTITUTE_ID;
const CONVERSATION_ID = process.env.TEST_CONVERSATION_ID;

const ADMIN_ID = "725b87d2-2343-42e1-9218-98d63cf1a07f";

const ADMIN_TOKEN = process.env.TEST_USER_A_TOKEN;
const STUDENT_TOKEN = process.env.TEST_USER_B_TOKEN;

const EVENTS = {
    JOIN: "chat:join",
    SEND_MESSAGE: "message:send",
    NEW_MESSAGE: "message:new",
};

function connectUser(token, name) {
    return new Promise((resolve, reject) => {
        const socket = io(API_ORIGIN, {
            auth: { token },
            transports: ["websocket"],
            reconnection: false,
            timeout: 10000,
        });

        const timer = setTimeout(() => {
            socket.disconnect();
            reject(new Error(`${name} connection timed out.`));
        }, 12000);

        socket.once("connect", () => {
            clearTimeout(timer);
            console.log(`[PASS] ${name} connected.`);
            resolve(socket);
        });

        socket.once("connect_error", (error) => {
            clearTimeout(timer);
            socket.disconnect();
            reject(new Error(`${name}: ${error.message}`));
        });
    });
}

function emitWithAck(socket, eventName, payload, timeout = 8000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(
                new Error(`Timeout waiting for ${eventName} acknowledgement.`)
            );
        }, timeout);

        socket.emit(eventName, payload, (response) => {
            clearTimeout(timer);
            resolve(response);
        });
    });
}

function waitForEvent(socket, eventName, timeout = 8000) {
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

function expectNoEvent(socket, eventName, duration = 1000) {
    return new Promise((resolve, reject) => {
        function handler() {
            clearTimeout(timer);
            reject(new Error(`Unexpected ${eventName} event received.`));
        }

        const timer = setTimeout(() => {
            socket.off(eventName, handler);
            resolve();
        }, duration);

        socket.once(eventName, handler);
    });
}

async function joinConversation(socket, name) {
    const response = await emitWithAck(
        socket,
        EVENTS.JOIN,
        {
            instituteId: INSTITUTE_ID,
            conversationId: CONVERSATION_ID,
        }
    );

    assert.equal(
        response?.success,
        true,
        `${name} failed to join conversation.`
    );

    console.log(`[PASS] ${name} joined the conversation.`);
}

async function run() {
    let adminSocket;
    let studentSocket;

    try {
        assert.ok(ADMIN_TOKEN, "Admin token missing.");
        assert.ok(STUDENT_TOKEN, "Student token missing.");
        assert.ok(INSTITUTE_ID, "Institute ID missing.");
        assert.ok(CONVERSATION_ID, "Conversation ID missing.");

        console.log("\nStarting Socket.IO message delivery tests...\n");

        // 1. Connect both users.
        adminSocket = await connectUser(
            ADMIN_TOKEN,
            "Institute Admin"
        );

        studentSocket = await connectUser(
            STUDENT_TOKEN,
            "Student"
        );

        // 2. Join the same conversation.
        await joinConversation(adminSocket, "Admin");
        await joinConversation(studentSocket, "Student");

        // 3. Prepare a unique message.
        const clientMessageId = randomUUID();

        const content =
            `Socket.IO integration test ${clientMessageId}`;

        const messagePayload = {
            instituteId: INSTITUTE_ID,
            conversationId: CONVERSATION_ID,
            content,
            clientMessageId,
        };

        // 4. Start listening before sending.
        const studentMessagePromise = waitForEvent(
            studentSocket,
            EVENTS.NEW_MESSAGE
        );

        const senderDuplicateCheck = expectNoEvent(
            adminSocket,
            EVENTS.NEW_MESSAGE,
            1500
        );

        // 5. Send message and receive acknowledgement.
        const adminAckPromise = emitWithAck(
            adminSocket,
            EVENTS.SEND_MESSAGE,
            messagePayload
        );

        const [studentPayload, adminAck] = await Promise.all([
            studentMessagePromise,
            adminAckPromise,
        ]);

        // 6. Verify sender acknowledgement.
        assert.equal(
            adminAck?.success,
            true,
            "Admin did not receive successful acknowledgement."
        );

        assert.equal(
            adminAck?.data?.content,
            content,
            "Acknowledged message content does not match."
        );

        assert.equal(
            adminAck?.data?.conversationId,
            CONVERSATION_ID,
            "Acknowledged conversation ID does not match."
        );

        assert.equal(
            adminAck?.data?.senderId,
            ADMIN_ID,
            "Acknowledged sender ID does not match."
        );

        assert.ok(
            adminAck?.data?.id,
            "Saved message ID is missing."
        );

        console.log("[PASS] Admin received successful acknowledgement.");
        console.log("[PASS] Saved message data verified.");

        // 7. Verify receiver event.
        assert.equal(
            studentPayload?.success,
            true,
            "Student received an unsuccessful message event."
        );

        assert.equal(
            studentPayload?.data?.id,
            adminAck.data.id,
            "Student and Admin received different message IDs."
        );

        assert.equal(
            studentPayload?.data?.content,
            content,
            "Student received incorrect message content."
        );

        assert.equal(
            studentPayload?.data?.conversationId,
            CONVERSATION_ID,
            "Student received incorrect conversation ID."
        );

        assert.equal(
            studentPayload?.data?.senderId,
            ADMIN_ID,
            "Student received incorrect sender ID."
        );

        console.log("[PASS] Student received message:new.");
        console.log("[PASS] Receiver message payload verified.");
        console.log("[PASS] Both users received the same saved message ID.");

        // 8. Verify sender did not receive duplicate broadcast.
        await senderDuplicateCheck;

        console.log("[PASS] Sender did not receive duplicate message:new.");

        console.log("\n======================================");
        console.log("[PASS] Socket.IO message delivery tests completed.");
        console.log("======================================\n");

    } catch (error) {
        console.error("\n[FAIL]", error.message);
        process.exitCode = 1;
    } finally {
        adminSocket?.disconnect();
        studentSocket?.disconnect();
    }
}

run();
