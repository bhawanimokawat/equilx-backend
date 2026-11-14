require("dotenv").config();

const env = require("./config/env");
const app = require("./app");

const {
    connectDatabase,
    disconnectDatabase,
} = require("./config/database");

const {
    expirePendingPayments,
} = require("./modules/payments/services/payment-expiry.service");

let server;
let shuttingDown = false;
let paymentExpiryInterval;

async function startServer() {
    try {
        await connectDatabase();

        // Check expired payments every minute.
        const runPaymentExpiry = async () => {
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
        };

        // Run expiry check when server starts.
        await runPaymentExpiry();

        // Repeat every 60 seconds.
        paymentExpiryInterval = setInterval(
            runPaymentExpiry,
            60 * 1000
        );

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

    if (paymentExpiryInterval) {
        clearInterval(paymentExpiryInterval);
    }

    if (server) {
        server.close(async (error) => {
            try {
                await disconnectDatabase();

                if (error) {
                    console.error(
                        "HTTP server shutdown failed:",
                        error.message
                    );
                    process.exitCode = 1;
                }
            } catch (dbError) {
                console.error(
                    "Database shutdown failed:",
                    dbError.message
                );
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