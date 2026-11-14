require("dotenv").config();

const http = require("http");

const env = require("./config/env");
const app = require("./app");

const {
  startAIWorker,
  closeAIWorker,
} = require("./modules/ai/workers/ai.worker");

const {
  connectDatabase,
  disconnectDatabase,
} = require("./config/database");

const { initializeSocket } = require("./config/socket");
const { closeRedis } = require("./config/redis");

const {
  expirePendingPayments,
} = require("./modules/payments/services/payment-expiry.service");

let server;
let io;
let shuttingDown = false;
let paymentExpiryInterval;

async function runPaymentExpiry() {
  try {
    const result = await expirePendingPayments();

    if (result.expiredCount > 0) {
      console.log(
        `[Payment Expiry] ${result.expiredCount} payment(s) expired.`
      );
    }
  } catch (error) {
    console.error(
      "[Payment Expiry] Scheduler error:",
      error.message
    );
  }
}

async function startServer() {
  try {
    await connectDatabase();

    // Start the AI BullMQ worker.
    startAIWorker();

    // Run payment expiry check immediately.
    await runPaymentExpiry();

    // Repeat payment expiry check every 60 seconds.
    paymentExpiryInterval = setInterval(
      runPaymentExpiry,
      60 * 1000
    );

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

    if (paymentExpiryInterval) {
      clearInterval(paymentExpiryInterval);
      paymentExpiryInterval = null;
    }

    await closeAIWorker().catch(() => {});

    if (io) {
      await new Promise((resolve) => io.close(resolve));
      io = null;
      server = null;
    } else if (server?.listening) {
      await new Promise((resolve) => server.close(resolve));
      server = null;
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
    // Stop payment expiry scheduler.
    if (paymentExpiryInterval) {
      clearInterval(paymentExpiryInterval);
      paymentExpiryInterval = null;
    }

    // Close AI BullMQ worker.
    await closeAIWorker();

    // Close Socket.IO and its attached HTTP server.
    if (io) {
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

      server = null;
    }

    // Close Socket.IO Redis publisher and subscriber.
    await closeRedis();

    // Disconnect PostgreSQL.
    await disconnectDatabase();

    console.log("[SERVER] Graceful shutdown completed.");
  } catch (error) {
    console.error(
      "[SERVER] Shutdown failed:",
      error.message
    );

    process.exitCode = 1;
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

startServer();
