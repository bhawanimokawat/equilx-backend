
require("dotenv").config();

const assert = require("node:assert/strict");
const { io } = require("socket.io-client");

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:5000";

const INSTITUTE_ID = process.env.TEST_INSTITUTE_ID;
const CONVERSATION_ID = process.env.TEST_CONVERSATION_ID;

const USERS = {
  A: {
    name: "Institute Admin",
    id: "725b87d2-2343-42e1-9218-98d63cf1a07f",
    token: process.env.TEST_USER_A_TOKEN,
  },
  B: {
    name: "Student 02",
    id: "3ead3111-d23b-4d5e-8301-1afa8bb5e101",
    token: process.env.TEST_USER_B_TOKEN,
  },
};

const EVENTS = {
  JOIN: "chat:join",
  SNAPSHOT: "presence:snapshot",
  ONLINE: "presence:online",
  OFFLINE: "presence:offline",
};

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

function connectUser(user) {
  return new Promise((resolve, reject) => {
    if (!user.token) {
      return reject(new Error(`${user.name} token is missing.`));
    }

    const socket = io(API_ORIGIN, {
      auth: { token: user.token },
      transports: ["websocket"],
      reconnection: false,
      timeout: 10000,
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`${user.name} connection timed out.`));
    }, 12000);

    socket.once("connect", () => {
      clearTimeout(timer);
      console.log(`[PASS] ${user.name} connected.`);
      resolve(socket);
    });

    socket.once("connect_error", (error) => {
      clearTimeout(timer);
      socket.disconnect();
      reject(new Error(`${user.name}: ${error.message}`));
    });
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
            new Error(response?.message || "Conversation join failed.")
          );
        }

        resolve(response);
      }
    );
  });
}

function assertPresence(snapshot, expectedUserId, expectedOnline) {
  assert.ok(snapshot, "Presence snapshot was not received.");

  const user = snapshot.users?.find(
    (item) => item.userId === expectedUserId
  );

  assert.ok(user, `User ${expectedUserId} missing from snapshot.`);
  assert.equal(user.online, expectedOnline);

  console.log(
    `[PASS] Presence snapshot: ${expectedUserId} online=${expectedOnline}`
  );
}

async function run() {
  let socketA;
  let socketB;

  try {
    assert.ok(INSTITUTE_ID, "TEST_INSTITUTE_ID is missing.");
    assert.ok(CONVERSATION_ID, "TEST_CONVERSATION_ID is missing.");

    console.log("\nStarting Socket.IO presence tests...\n");

    // 1. Connect Student 03.
    socketA = await connectUser(USERS.A);

    // 2. Student 03 joins the group.
    const snapshotA = waitForEvent(socketA, EVENTS.SNAPSHOT);

    const joinA = await joinConversation(socketA);
    assert.equal(joinA.conversationId, CONVERSATION_ID);

    const presenceA = await snapshotA;

    console.log("[PASS] Student 03 joined the conversation.");

    // 3. Listen for Student 02 coming online.
    const onlineEvent = waitForEvent(socketA, EVENTS.ONLINE);

    // 4. Connect Student 02.
    socketB = await connectUser(USERS.B);

    const onlinePayload = await onlineEvent;

    console.log("[DEBUG] Expected user ID:", USERS.B.id);
    console.log("[DEBUG] Received online payload:", onlinePayload);

    assert.equal(onlinePayload.userId, USERS.B.id);
    assert.equal(onlinePayload.online, true);

    console.log("[PASS] Student 02 online event received.");

    // 5. Student 02 joins the same group.
    const snapshotB = waitForEvent(socketB, EVENTS.SNAPSHOT);

    const joinB = await joinConversation(socketB);
    assert.equal(joinB.conversationId, CONVERSATION_ID);

    const presenceB = await snapshotB;

    console.log("[PASS] Student 02 joined the conversation.");


    console.log("[DEBUG] Student 02 presence snapshot:", presenceB);
    console.log("[DEBUG] Expected conversation ID:", CONVERSATION_ID);

    // 6. Verify both presence snapshots.

    console.log("[DEBUG] Checking Student 03 presence:", {
      expectedUserId: USERS.A.id,
      snapshotUsers: presenceB.users,
    });
    assertPresence(presenceB, USERS.A.id, true);

    // Student 03's initial snapshot may show Student 02 offline.
    assert.ok(presenceA.users?.some(
      (item) => item.userId === USERS.B.id
    ));

    console.log("[PASS] Both users are visible in presence data.");

    // 7. Verify offline event when Student 02 disconnects.
    const offlineEvent = waitForEvent(socketA, EVENTS.OFFLINE);

    socketB.disconnect();
    socketB = null;

    const offlinePayload = await offlineEvent;

    assert.equal(offlinePayload.userId, USERS.B.id);
    assert.equal(offlinePayload.online, false);

    console.log("[PASS] Student 02 offline event received.");

    console.log("\n================================");
    console.log("[PASS] Socket.IO presence tests completed.");
    console.log("================================\n");
  } catch (error) {
    console.error("\n[FAIL]", error.message);
    process.exitCode = 1;
  } finally {
    socketA?.disconnect();
    socketB?.disconnect();
  }
}

run();
