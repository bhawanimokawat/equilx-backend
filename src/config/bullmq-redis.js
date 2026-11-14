const Redis = require("ioredis");

const bullmqRedisConnection = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
});

bullmqRedisConnection.on("connect", () => {
    console.log("[BullMQ Redis] Connecting...");
});

bullmqRedisConnection.on("ready", () => {
    console.log("[BullMQ Redis] Connected successfully.");
});

bullmqRedisConnection.on("error", (error) => {
    console.error("[BullMQ Redis] Connection error:", error.message);
});

module.exports = bullmqRedisConnection;