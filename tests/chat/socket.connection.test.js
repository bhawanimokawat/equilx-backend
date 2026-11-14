
require("dotenv").config();

const { io } = require("socket.io-client");

const API_ORIGIN = process.env.API_ORIGIN || "http://localhost:5000";

const TEST_USERS = [
  {
    name: "User A",
    token: process.env.TEST_USER_A_TOKEN,
  },
  {
    name: "User B",
    token: process.env.TEST_USER_B_TOKEN,
  },
];

function connectUser(user) {
  return new Promise((resolve, reject) => {
    if (!user.token) {
      return reject(
        new Error(`${user.name} access token is missing from .env`)
      );
    }

    const socket = io(API_ORIGIN, {
      auth: {
        token: user.token,
      },
      transports: ["websocket"],
      reconnection: false,
      timeout: 10000,
    });

    const timeout = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`${user.name} connection timed out.`));
    }, 12000);

    socket.once("connect", () => {
      clearTimeout(timeout);

      console.log(`[PASS] ${user.name} connected successfully.`);
      console.log(`[INFO] Socket ID: ${socket.id}`);

      resolve(socket);
    });

    socket.once("connect_error", (error) => {
      clearTimeout(timeout);
      socket.disconnect();

      reject(
        new Error(`${user.name} authentication/connection failed: ${error.message}`)
      );
    });
  });
}

async function run() {
  const connectedSockets = [];

  try {
    console.log("\nStarting Socket.IO connection tests...\n");

    const userA = await connectUser(TEST_USERS[0]);
    connectedSockets.push(userA);

    const userB = await connectUser(TEST_USERS[1]);
    connectedSockets.push(userB);

    console.log("\n================================");
    console.log("[PASS] Both users authenticated.");
    console.log("[PASS] Both Socket.IO connections established.");
    console.log("================================\n");
  } catch (error) {
    console.error("\n[FAIL]", error.message);
    process.exitCode = 1;
  } finally {
    for (const socket of connectedSockets) {
      socket.disconnect();
    }
  }
}

run();
