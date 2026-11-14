
require("dotenv").config();

const assert = require("node:assert/strict");
const { io } = require("socket.io-client");

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:5000";
const INSTITUTE_ID = process.env.TEST_INSTITUTE_ID;
const CONVERSATION_ID = process.env.TEST_CONVERSATION_ID;

const UNAUTHORIZED_CONVERSATION_ID =
    "99999999-9999-4999-8999-999999999999";

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

async function run() {
    let adminSocket;
    let unauthorizedSocket;

    try {
        assert.ok(ADMIN_TOKEN, "Admin token missing.");
        assert.ok(STUDENT_TOKEN, "Student token missing.");
        assert.ok(INSTITUTE_ID, "Institute ID missing.");
        assert.ok(CONVERSATION_ID, "Conversation ID missing.");

        console.log("\nStarting typing authorization tests...\n");

        // 1. Connect Admin.
        adminSocket = await connectUser(
            ADMIN_TOKEN,
            "Admin"
        );

        // 2. Admin joins the real conversation.
        const adminJoin = await emitWithAck(
            adminSocket,
            EVENTS.JOIN,
            {
                instituteId: INSTITUTE_ID,
                conversationId: CONVERSATION_ID,
            }
        );

        assert.equal(adminJoin?.success, true);

        console.log("[PASS] Admin joined the conversation.");

        // 3. Connect Student without joining the target conversation.
        unauthorizedSocket = await connectUser(
            STUDENT_TOKEN,
            "Unauthorized test user"
        );

        console.log("[PASS] Unauthorized user connected.");

        // 4. Attempt typing:start on a nonexistent conversation.
        const startAck = await emitWithAck(
            unauthorizedSocket,
            EVENTS.TYPING_START,
            {
                instituteId: INSTITUTE_ID,
                conversationId: UNAUTHORIZED_CONVERSATION_ID,
            }
        );

        assert.equal(startAck?.success, false);
        assert.equal(
            startAck?.message,
            "Unable to process typing event."
        );

        console.log("[PASS] Unauthorized typing:start rejected.");

        // 5. Attempt typing:stop on the same conversation.
        const stopAck = await emitWithAck(
            unauthorizedSocket,
            EVENTS.TYPING_STOP,
            {
                instituteId: INSTITUTE_ID,
                conversationId: UNAUTHORIZED_CONVERSATION_ID,
            }
        );

        assert.equal(stopAck?.success, false);
        assert.equal(
            stopAck?.message,
            "Unable to process typing event."
        );

        console.log("[PASS] Unauthorized typing:stop rejected.");

        // 6. Verify no unauthorized events reach Admin.
        const noStartLeak = expectNoEvent(
            adminSocket,
            EVENTS.TYPING_START,
            2000
        );

        const noStopLeak = expectNoEvent(
            adminSocket,
            EVENTS.TYPING_STOP,
            2000
        );

        assert.equal(
            await noStartLeak,
            true,
            "Unauthorized typing:start reached Admin."
        );

        assert.equal(
            await noStopLeak,
            true,
            "Unauthorized typing:stop reached Admin."
        );

        console.log("[PASS] Unauthorized typing events were not broadcast.");

        console.log("\n======================================");
        console.log("[PASS] Typing authorization tests completed.");
        console.log("======================================\n");

    } catch (error) {
        console.error("\n[FAIL]", error.message);
        process.exitCode = 1;
    } finally {
        adminSocket?.disconnect();
        unauthorizedSocket?.disconnect();
    }
}

run();
