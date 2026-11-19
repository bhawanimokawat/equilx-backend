
const path = require("node:path");
const dotenv = require("dotenv");

// Load the isolated test environment first.
dotenv.config({
    path: path.resolve(__dirname, "../.env.test"),
    override: true,
});

process.env.NODE_ENV = "test";

// Use Mailpit instead of Gmail.
process.env.SMTP_HOST = "127.0.0.1";
process.env.SMTP_PORT = "1025";
process.env.SMTP_USER = "test";
process.env.SMTP_PASS = "test";
process.env.SMTP_FROM = "Equilx Test <test@equilx.local>";

// Use a separate port for the test server.
process.env.PORT = "5001";

const databaseName = decodeURIComponent(
    new URL(process.env.DATABASE_URL).pathname.replace(/^\/+/, "")
);

if (databaseName !== "equilx_ielts_test") {
    throw new Error(`Unsafe database: ${databaseName}`);
}

const env = require("./config/env");
const app = require("./app");
const {
    connectDatabase,
    disconnectDatabase,
} = require("./config/database");

let server;

async function start() {
    await connectDatabase();

    server = app.listen(env.PORT, () => {
        console.log(
            `Equilx TEST API running on port ${env.PORT}`
        );
        console.log(`Database: ${databaseName}`);
        console.log("Email: Mailpit");
    });
}

async function shutdown() {
    if (server) {
        await new Promise((resolve) => server.close(resolve));
    }

    await disconnectDatabase();
    process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

start().catch(async (error) => {
    console.error("Test server startup failed:", error.message);
    await disconnectDatabase().catch(() => {});
    process.exit(1);
});
