require("dotenv").config();

const env = require("./config/env");
const app = require("./app");

const {
  connectDatabase,
  disconnectDatabase,
} = require("./config/database");

let server;
let shuttingDown = false;

async function startServer() {
  try {
    await connectDatabase();

    server = app.listen(env.PORT, () => {
      console.log(
        `Equilx IELTS API running on port ${env.PORT} (${env.NODE_ENV})`
      );
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
