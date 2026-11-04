
require("dotenv").config();

const env = require("./config/env");
const app = require("./app");

const {
  connectDatabase,
  disconnectDatabase,
} = require("./config/database");

// ADD: Marketing email service
const {
  processPromotionalEmails,
} = require("./modules/marketing/services/marketing-email.service");

let server;
let shuttingDown = false;

// ADD: Scheduler variables
let marketingEmailTimer;
let marketingEmailJobRunning = false;

// ADD: Marketing email job
async function runMarketingEmailJob() {
  if (marketingEmailJobRunning || shuttingDown) return;

  marketingEmailJobRunning = true;

  try {
    const result = await processPromotionalEmails();
    console.log("Marketing email job completed:", result);
  } catch (error) {
    console.error("Marketing email job failed:", error);
  } finally {
    marketingEmailJobRunning = false;
  }
}

async function startServer() {
  try {
    await connectDatabase();

    server = app.listen(env.PORT, () => {
      console.log(
        `Equilx IELTS API running on port ${env.PORT} (${env.NODE_ENV})`
      );

      // ADD: Start marketing email scheduler
      runMarketingEmailJob();

      marketingEmailTimer = setInterval(
        runMarketingEmailJob,
        6 * 60 * 60 * 1000
      );

      marketingEmailTimer.unref();
    });
  } catch (error) {
    console.error("Database connection failed:", error.message);
    process.exitCode = 1;
    await disconnectDatabase().catch(() => {});
  }
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received. Closing server...`);

  // ADD: Stop marketing email scheduler
  if (marketingEmailTimer) {
    clearInterval(marketingEmailTimer);
  }

  if (server) {
    server.close(async (error) => {
      try {
        await disconnectDatabase();

        if (error) {
          console.error("HTTP server shutdown failed:", error.message);
          process.exitCode = 1;
        }
      } catch (dbError) {
        console.error("Database shutdown failed:", dbError.message);
        process.exitCode = 1;
      }
    });
  } else {
    await disconnectDatabase().catch(() => {});
  }
}

process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));

startServer();
