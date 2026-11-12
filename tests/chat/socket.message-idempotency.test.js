
require("dotenv").config();

const assert = require("node:assert/strict");
const { io } = require("socket.io-client");
const { randomUUID } = require("node:crypto");

const API_ORIGIN =
    process.env.API_ORIGIN || "http://localhost:5000";

const INSTITUTE_ID = process.env.TEST_INSTITUTE_ID;
const CONVERSATION_ID = process.env.TEST_CONVERSATION_ID;

const ADMIN_TOKEN = process.env.TEST_USER_A_TOKEN;
const STUDENT_TOKEN = process.env.TEST_USER_B_TOKEN;

const INVALID_CONVERSATION_ID =
    "99999999-9999-4999-8999-999999999999";

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

function expectNoEvent(socket, eventName, duration = 1200) {
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

        console.log("\nStarting message idempotency tests...\n");

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

        // 3. Prepare one message with a unique client ID.
        const clientMessageId = randomUUID();
        const content = `Idempotency test ${clientMessageId}`;

        const payload = {
            instituteId: INSTITUTE_ID,
            conversationId: CONVERSATION_ID,
            content,
            clientMessageId,
        };

        // 4. First request should create and broadcast the message.
        const firstEventPromise = waitForEvent(
            studentSocket,
            EVENTS.NEW_MESSAGE
        );

        const firstAckPromise = emitWithAck(
            adminSocket,
            EVENTS.SEND_MESSAGE,
            payload
        );

        const [firstAck, firstEvent] = await Promise.all([
            firstAckPromise,
            firstEventPromise,
        ]);

        assert.equal(firstAck?.success, true);
        assert.equal(firstEvent?.success, true);

        assert.ok(firstAck?.data?.id);
        assert.equal(firstEvent?.data?.id, firstAck.data.id);
        assert.equal(firstAck?.data?.content, content);

        const originalMessageId = firstAck.data.id;

        console.log("[PASS] First request created the message.");
        console.log("[PASS] Student received the first message.");

        // 5. Retry with the same clientMessageId.
        const noDuplicateEventPromise = expectNoEvent(
            studentSocket,
            EVENTS.NEW_MESSAGE
        );

        const retryAck = await emitWithAck(
            adminSocket,
            EVENTS.SEND_MESSAGE,
            payload
        );

        assert.equal(
            retryAck?.success,
            true,
            "Retry request was not successful."
        );

        assert.equal(
            retryAck?.data?.id,
            originalMessageId,
            "Retry created a different database message."
        );

        assert.equal(
            retryAck?.data?.clientMessageId,
            clientMessageId,
            "Client message ID does not match."
        );

        console.log("[PASS] Retry returned the existing message.");
        console.log("[PASS] Retry did not create a second message.");

        // 6. Verify retry was not broadcast again.
        await noDuplicateEventPromise;

        console.log("[PASS] Retry did not broadcast a duplicate message.");

        // 7. Reuse the same client ID in another conversation.
        const conflictResponse = await emitWithAck(
            adminSocket,
            EVENTS.SEND_MESSAGE,
            {
                instituteId: INSTITUTE_ID,
                conversationId: INVALID_CONVERSATION_ID,
                content: "Different conversation test.",
                clientMessageId,
            }
        );

        assert.equal(
            conflictResponse?.success,
            false,
            "Reusing the client ID in another conversation was not rejected."
        );

        assert.equal(
            conflictResponse?.message,
            "Unable to send message."
        );

        console.log("[PASS] Cross-conversation client ID reuse rejected.");

        console.log("\n======================================");
        console.log("[PASS] Message idempotency tests completed.");
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
