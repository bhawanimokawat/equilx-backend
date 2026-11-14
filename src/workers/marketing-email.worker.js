
require("dotenv").config();

const { Queue, Worker } = require("bullmq");
const redisConnection = require("../config/redis");
const {
    connectDatabase,
    disconnectDatabase,
} = require("../config/database");

const {
    processPromotionalEmails,
} = require("../modules/marketing/services/marketing-email.service");

const QUEUE_NAME = "marketing-email-queue";
const DAILY_INTERVAL = 24 * 60 * 60 * 1000;

const marketingEmailQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
    },
});

let worker;
let shuttingDown = false;

async function startWorker() {
    try {
        await connectDatabase();

        worker = new Worker(
            QUEUE_NAME,
            async (job) => {
                console.log(
                    `[Marketing Worker] Processing job: ${job.id}`
                );

                const result = await processPromotionalEmails();

                console.log("[Marketing Worker] Result:", result);

                if (result.failed > 0) {
                    throw new Error(
                        `${result.failed} promotional email(s) failed.`
                    );
                }

                return result;
            },
            {
                connection: redisConnection,
                concurrency: 1,
            }
        );

        worker.on("completed", (job) => {
            console.log(
                `[Marketing Worker] Job ${job.id} completed.`
            );
        });

        worker.on("failed", (job, error) => {
            console.error(
                `[Marketing Worker] Job ${job?.id} failed:`,
                error.message
            );
        });

        // Run one eligibility check immediately.
        await marketingEmailQueue.add(
            "process-promotional-emails",
            {},
            {
                jobId: `marketing-email-initial-${new Date()
                    .toISOString()
                    .slice(0, 10)}`,
            }
        );

        // Check daily; the service sends only emails that are due
        // according to its existing seven-day eligibility rules.
        await marketingEmailQueue.add(
            "process-promotional-emails",
            {},
            {
                repeat: {
                    every: DAILY_INTERVAL,
                },
            }
        );

        console.log(
            "[Marketing Worker] Started. Daily eligibility check scheduled."
        );
    } catch (error) {
        console.error(
            "[Marketing Worker] Startup failed:",
            error
        );

        await shutdown();
        process.exitCode = 1;
    }
}

async function shutdown() {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log("[Marketing Worker] Shutting down...");

    try {
        if (worker) {
            await worker.close();
        }

        await marketingEmailQueue.close();
        await redisConnection.quit();
        await disconnectDatabase();

        console.log("[Marketing Worker] Shutdown complete.");
    } catch (error) {
        console.error(
            "[Marketing Worker] Shutdown error:",
            error.message
        );
    }
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

startWorker();
