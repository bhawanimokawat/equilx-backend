const Redis = require("ioredis");

const redisConnection = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT || 6379),
    maxRetriesPerRequest: null,
    enableReadyCheck: true,
});

redisConnection.on("connect", () => {
    console.log("[Redis] Connecting...");
});

redisConnection.on("ready", () => {
    console.log("[Redis] Connected successfully.");
});

redisConnection.on("error", (error) => {
    console.error("[Redis] Connection error:", error.message);
});

module.exports = redisConnection;