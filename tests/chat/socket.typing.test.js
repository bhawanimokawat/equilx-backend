
require("dotenv").config();

const assert = require("node:assert/strict");
const { io } = require("socket.io-client");

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:5000";
const INSTITUTE_ID = process.env.TEST_INSTITUTE_ID;
const CONVERSATION_ID = process.env.TEST_CONVERSATION_ID;

const ADMIN_ID = "725b87d2-2343-42e1-9218-98d63cf1a07f";

const ADMIN_TOKEN = process.env.TEST_USER_A_TOKEN;
const STUDENT_TOKEN = process.env.TEST_USER_B_TOKEN;

const EVENTS = {
    JOIN: "chat:join",
    TYPING_START: "typing:start",
    TYPING_STOP: "typing:stop",
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
            reject(new Error(`Timeout waiting for ${eventName} acknowledgement.`));
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

        console.log("\nStarting Socket.IO typing tests...\n");

        // 1. Connect Admin.
        adminSocket = await connectUser(
            ADMIN_TOKEN,
            "Institute Admin"
        );

        // 2. Connect Student.
        studentSocket = await connectUser(
            STUDENT_TOKEN,
            "Student"
        );

        // 3. Both users join the same conversation.
        await joinConversation(adminSocket, "Admin");
        await joinConversation(studentSocket, "Student");

        // 4. Test typing:start.
        const startEventPromise = waitForEvent(
            studentSocket,
            EVENTS.TYPING_START
        );

        const startAckPromise = emitWithAck(
            adminSocket,
            EVENTS.TYPING_START,
            {
                instituteId: INSTITUTE_ID,
                conversationId: CONVERSATION_ID,
            }
        );

        const [startPayload, startAck] = await Promise.all([
            startEventPromise,
            startAckPromise,
        ]);

        assert.equal(startAck?.success, true);
        assert.equal(startPayload?.success, true);
        assert.equal(startPayload?.data?.conversationId, CONVERSATION_ID);
        assert.equal(startPayload?.data?.userId, ADMIN_ID);

        console.log("[PASS] typing:start acknowledgement received.");
        console.log("[PASS] Student received typing:start event.");
        console.log("[PASS] typing:start payload verified.");

        // 5. Test typing:stop.
        const stopEventPromise = waitForEvent(
            studentSocket,
            EVENTS.TYPING_STOP
        );

        const stopAckPromise = emitWithAck(
            adminSocket,
            EVENTS.TYPING_STOP,
            {
                instituteId: INSTITUTE_ID,
                conversationId: CONVERSATION_ID,
            }
        );

        const [stopPayload, stopAck] = await Promise.all([
            stopEventPromise,
            stopAckPromise,
        ]);

        assert.equal(stopAck?.success, true);
        assert.equal(stopPayload?.success, true);
        assert.equal(stopPayload?.data?.conversationId, CONVERSATION_ID);
        assert.equal(stopPayload?.data?.userId, ADMIN_ID);

        console.log("[PASS] typing:stop acknowledgement received.");
        console.log("[PASS] Student received typing:stop event.");
        console.log("[PASS] typing:stop payload verified.");

        console.log("\n======================================");
        console.log("[PASS] Socket.IO typing tests completed.");
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
