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

const UNAUTHORIZED_CONVERSATION_ID =
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

function expectNoEvent(socket, eventName, duration = 1500) {
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

        console.log("\nStarting message authorization tests...\n");

        // 1. Connect both users.
        adminSocket = await connectUser(
            ADMIN_TOKEN,
            "Institute Admin"
        );

        studentSocket = await connectUser(
            STUDENT_TOKEN,
            "Student"
        );

        // 2. Admin joins the real conversation.
        await joinConversation(adminSocket, "Admin");

        // 3. Student attempts to send to an inaccessible conversation.
        const messagePayload = {
            instituteId: INSTITUTE_ID,
            conversationId: UNAUTHORIZED_CONVERSATION_ID,
            content: "Unauthorized message test.",
            clientMessageId: randomUUID(),
        };

        // Listen for an unexpected broadcast.
        const noBroadcastPromise = expectNoEvent(
            adminSocket,
            EVENTS.NEW_MESSAGE
        );

        // 4. Send the unauthorized message.
        const response = await emitWithAck(
            studentSocket,
            EVENTS.SEND_MESSAGE,
            messagePayload
        );

        assert.equal(
            response?.success,
            false,
            "Unauthorized message was not rejected."
        );

        assert.equal(
            response?.message,
            "Unable to send message.",
            "Unexpected authorization error response."
        );

        console.log("[PASS] Unauthorized message request rejected.");

        // 5. Verify no message was broadcast.
        await noBroadcastPromise;

        console.log("[PASS] Unauthorized message was not broadcast.");

        console.log("\n======================================");
        console.log("[PASS] Message authorization tests completed.");
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
