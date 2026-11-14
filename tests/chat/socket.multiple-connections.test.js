
require("dotenv").config();

const assert = require("node:assert/strict");
const { io } = require("socket.io-client");

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:5000";
const INSTITUTE_ID = process.env.TEST_INSTITUTE_ID;
const CONVERSATION_ID = process.env.TEST_CONVERSATION_ID;

const ADMIN_ID = "725b87d2-2343-42e1-9218-98d63cf1a07f";
const STUDENT_ID = "3ead3111-d23b-4d5e-8301-1afa8bb5e101";

const ADMIN_TOKEN = process.env.TEST_USER_A_TOKEN;
const STUDENT_TOKEN = process.env.TEST_USER_B_TOKEN;

const EVENTS = {
    JOIN: "chat:join",
    SNAPSHOT: "presence:snapshot",
    ONLINE: "presence:online",
    OFFLINE: "presence:offline",
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

function waitForEvent(socket, eventName, timeout = 8000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(eventName, handler);
            reject(new Error(`Timeout waiting for ${eventName}`));
        }, timeout);

        function handler(payload) {
            clearTimeout(timer);
            resolve(payload);
        }

        socket.once(eventName, handler);
    });
}

// Resolves true if the event does NOT occur.
// Resolves false if the event occurs within the duration.
function expectNoEvent(socket, eventName, duration = 2500) {
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

function joinConversation(socket) {
    return new Promise((resolve, reject) => {
        socket.emit(
            EVENTS.JOIN,
            {
                instituteId: INSTITUTE_ID,
                conversationId: CONVERSATION_ID,
            },
            (response) => {
                if (!response?.success) {
                    return reject(
                        new Error(response?.message || "Join failed.")
                    );
                }

                resolve(response);
            }
        );
    });
}

function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
    let adminSocket1;
    let adminSocket2;
    let studentSocket;

    try {
        assert.ok(ADMIN_TOKEN, "Admin token missing.");
        assert.ok(STUDENT_TOKEN, "Student token missing.");
        assert.ok(INSTITUTE_ID, "Institute ID missing.");
        assert.ok(CONVERSATION_ID, "Conversation ID missing.");

        console.log("\nStarting multiple-socket tests...\n");

        // 1. Connect Admin's first socket.
        adminSocket1 = await connectUser(ADMIN_TOKEN, "Admin socket 1");

        await joinConversation(adminSocket1);
        console.log("[PASS] Admin socket 1 joined.");

        // 2. Connect Student.
        studentSocket = await connectUser(STUDENT_TOKEN, "Student");

        await joinConversation(studentSocket);
        console.log("[PASS] Student joined.");

        // 3. Allow presence registration to complete.
        await delay(500);

        // 4. Connect Admin's second socket.
        adminSocket2 = await connectUser(ADMIN_TOKEN, "Admin socket 2");

        await joinConversation(adminSocket2);
        console.log("[PASS] Admin socket 2 joined.");

        await delay(500);

        // 5. Listen for offline BEFORE disconnecting the first socket.
        const stayedOnlinePromise = expectNoEvent(
            studentSocket,
            EVENTS.OFFLINE,
            2500
        );

        // 6. Disconnect only the first Admin socket.
        adminSocket1.disconnect();
        adminSocket1 = null;

        // 7. Admin must remain online.
        const stayedOnline = await stayedOnlinePromise;

        assert.equal(
            stayedOnline,
            true,
            "Admin incorrectly became offline after first socket disconnected."
        );

        console.log(
            "[PASS] Admin remains online after first socket disconnects."
        );

        // 8. Listen for offline BEFORE disconnecting the final socket.
        const finalOfflinePromise = waitForEvent(
            studentSocket,
            EVENTS.OFFLINE,
            8000
        );

        // 9. Disconnect the final Admin socket.
        adminSocket2.disconnect();
        adminSocket2 = null;

        // 10. Verify offline event.
        const offlinePayload = await finalOfflinePromise;

        assert.equal(
            offlinePayload.userId,
            ADMIN_ID,
            "Offline event contains an incorrect user ID."
        );

        assert.equal(
            offlinePayload.online,
            false,
            "Admin offline status should be false."
        );

        console.log(
            "[PASS] Admin becomes offline after last socket disconnects."
        );

        console.log("\n======================================");
        console.log("[PASS] Multiple-socket tests completed.");
        console.log("======================================\n");

    } catch (error) {
        console.error("\n[FAIL]", error.message);
        process.exitCode = 1;
    } finally {
        adminSocket1?.disconnect();
        adminSocket2?.disconnect();
        studentSocket?.disconnect();
    }
}

run();
