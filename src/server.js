
require("dotenv").config();

const http = require("http");

const env = require("./config/env");
const app = require("./app");

const {
  connectDatabase,
  disconnectDatabase,
} = require("./config/database");

const { initializeSocket } = require("./config/socket");
const { closeRedis } = require("./config/redis");

let server;
let io;
let shuttingDown = false;

async function startServer() {
  try {
    await connectDatabase();

    // Create one HTTP server for Express and Socket.IO.
    server = http.createServer(app);

    // Initialize Socket.IO and Redis Adapter.
    io = await initializeSocket(server);

    server.listen(env.PORT, () => {
      console.log(
        `Equilx IELTS API running on port ${env.PORT} (${env.NODE_ENV})`
      );
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);

    if (io) {
      await new Promise((resolve) => io.close(resolve));
      io = null;
    } else if (server?.listening) {
      await new Promise((resolve) => server.close(resolve));
    }

    await closeRedis().catch(() => {});
    await disconnectDatabase().catch(() => {});

    process.exitCode = 1;
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received. Closing server...`);

  try {
    if (io) {
      // Socket.IO closes its attached HTTP server as well.
      await new Promise((resolve) => io.close(resolve));
      io = null;
      server = null;
    } else if (server?.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });
      });
    }

    await closeRedis();
    await disconnectDatabase();

    console.log("[SERVER] Graceful shutdown completed.");
  } catch (error) {
    console.error("[SERVER] Shutdown failed:", error.message);
    process.exitCode = 1;
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

startServer();
