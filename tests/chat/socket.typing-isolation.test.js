
require("dotenv").config();

const assert = require("node:assert/strict");
const { io } = require("socket.io-client");

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:5000";
const INSTITUTE_ID = process.env.TEST_INSTITUTE_ID;

const GROUP_CONVERSATION_ID = process.env.TEST_CONVERSATION_ID;

// Previously observed active direct conversation shared by Admin and Student.
const DIRECT_CONVERSATION_ID =
    "8aa139f0-4978-49af-a701-3e5d6c93458e";

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

function expectNoEvent(socket, eventName, duration = 2000) {
    return new Promise((resolve) => {
        const handler = () => {
            clearTimeout(timer);
            resolve(false);
        };

        const timer = setTimeout(() => {
            socket.off(eventName, handler);
            resolve(true);
        }, duration);

        socket.once(eventName, handler);
    });
}

async function joinConversation(socket, conversationId, name) {
    const response = await emitWithAck(socket, EVENTS.JOIN, {
        instituteId: INSTITUTE_ID,
        conversationId,
    });

    assert.equal(
        response?.success,
        true,
        `${name} failed to join conversation: ${conversationId}`
    );

    console.log(`[PASS] ${name} joined conversation.`);
}

async function run() {
    let adminSocket;
    let studentGroupSocket;
    let studentDirectSocket;

    try {
        assert.ok(ADMIN_TOKEN, "Admin token missing.");
        assert.ok(STUDENT_TOKEN, "Student token missing.");
        assert.ok(INSTITUTE_ID, "Institute ID missing.");
        assert.ok(GROUP_CONVERSATION_ID, "Group conversation ID missing.");

        console.log("\nStarting typing isolation tests...\n");

        // 1. Connect Admin.
        adminSocket = await connectUser(
            ADMIN_TOKEN,
            "Admin"
        );

        // 2. Connect Student's first socket.
        studentGroupSocket = await connectUser(
            STUDENT_TOKEN,
            "Student group socket"
        );

        // 3. Connect Student's second socket.
        studentDirectSocket = await connectUser(
            STUDENT_TOKEN,
            "Student direct socket"
        );

        // 4. Join separate conversations.
        await joinConversation(
            adminSocket,
            GROUP_CONVERSATION_ID,
            "Admin"
        );

        await joinConversation(
            studentGroupSocket,
            GROUP_CONVERSATION_ID,
            "Student group socket"
        );

        await joinConversation(
            studentDirectSocket,
            DIRECT_CONVERSATION_ID,
            "Student direct socket"
        );

        // 5. Listen for typing:start in both sockets.
        const groupTypingPromise = waitForEvent(
            studentGroupSocket,
            EVENTS.TYPING_START
        );

        const directNoTypingPromise = expectNoEvent(
            studentDirectSocket,
            EVENTS.TYPING_START,
            2500
        );

        // 6. Admin starts typing in the group conversation.
        const startAck = await emitWithAck(
            adminSocket,
            EVENTS.TYPING_START,
            {
                instituteId: INSTITUTE_ID,
                conversationId: GROUP_CONVERSATION_ID,
            }
        );

        assert.equal(
            startAck?.success,
            true,
            "Typing start acknowledgement failed."
        );

        const groupPayload = await groupTypingPromise;

        assert.equal(
            groupPayload?.data?.conversationId,
            GROUP_CONVERSATION_ID
        );

        assert.equal(
            await directNoTypingPromise,
            true,
            "Typing event leaked into the direct conversation."
        );

        console.log("[PASS] Group participant received typing:start.");
        console.log("[PASS] Direct conversation did not receive typing:start.");

        // 7. Repeat isolation test for typing:stop.
        const groupStopPromise = waitForEvent(
            studentGroupSocket,
            EVENTS.TYPING_STOP
        );

        const directNoStopPromise = expectNoEvent(
            studentDirectSocket,
            EVENTS.TYPING_STOP,
            2500
        );

        const stopAck = await emitWithAck(
            adminSocket,
            EVENTS.TYPING_STOP,
            {
                instituteId: INSTITUTE_ID,
                conversationId: GROUP_CONVERSATION_ID,
            }
        );

        assert.equal(
            stopAck?.success,
            true,
            "Typing stop acknowledgement failed."
        );

        const stopPayload = await groupStopPromise;

        assert.equal(
            stopPayload?.data?.conversationId,
            GROUP_CONVERSATION_ID
        );

        assert.equal(
            await directNoStopPromise,
            true,
            "Typing stop event leaked into the direct conversation."
        );

        console.log("[PASS] Group participant received typing:stop.");
        console.log("[PASS] Direct conversation did not receive typing:stop.");

        console.log("\n======================================");
        console.log("[PASS] Typing isolation tests completed.");
        console.log("======================================\n");

    } catch (error) {
        console.error("\n[FAIL]", error.message);
        process.exitCode = 1;
    } finally {
        adminSocket?.disconnect();
        studentGroupSocket?.disconnect();
        studentDirectSocket?.disconnect();
    }
}

run();
