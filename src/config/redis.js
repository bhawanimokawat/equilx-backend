
const { createClient } = require("redis");

let pubClient = null;
let subClient = null;

async function initializeRedis() {
  if (pubClient?.isReady && subClient?.isReady) {
    return { pubClient, subClient };
  }

  const redisUrl =
    process.env.REDIS_URL || "redis://127.0.0.1:6379";

  pubClient = createClient({ url: redisUrl });
  subClient = pubClient.duplicate();

  pubClient.on("error", (error) => {
    console.error("[REDIS PUBLISHER ERROR]", error.message);
  });

  subClient.on("error", (error) => {
    console.error("[REDIS SUBSCRIBER ERROR]", error.message);
  });

  await Promise.all([
    pubClient.connect(),
    subClient.connect(),
  ]);

  console.log("[REDIS] Publisher and subscriber connected.");

  return { pubClient, subClient };
}

function getRedisClients() {
  if (!pubClient?.isReady || !subClient?.isReady) {
    throw new Error("Redis clients are not initialized.");
  }

  return { pubClient, subClient };
}

async function closeRedis() {
  const clients = [pubClient, subClient].filter(Boolean);

  await Promise.all(
    clients.map(async (client) => {
      if (client.isOpen) {
        await client.quit();
      }
    })
  );

  pubClient = null;
  subClient = null;
}

module.exports = {
  initializeRedis,
  getRedisClients,
  closeRedis,
};
