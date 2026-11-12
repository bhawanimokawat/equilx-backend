
const { initializeRedis, closeRedis } = require("../../src/config/redis");
const presenceService = require("../../src/modules/chat/services/presence.service");

const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const socket1 = "test-socket-1";
const socket2 = "test-socket-2";

async function run() {
  try {
    await initializeRedis();

    const first = await presenceService.addSocket(userId, socket1);
    console.log("First socket:", first, "| Expected: 1");

    const second = await presenceService.addSocket(userId, socket2);
    console.log("Second socket:", second, "| Expected: 2");

    const online = await presenceService.isUserOnline(userId);
    console.log("User online:", online, "| Expected: true");

    const remaining = await presenceService.removeSocket(userId, socket1);
    console.log("After first disconnect:", remaining, "| Expected: 1");

    const stillOnline = await presenceService.isUserOnline(userId);
    console.log("Still online:", stillOnline, "| Expected: true");

    const last = await presenceService.removeSocket(userId, socket2);
    console.log("After last disconnect:", last, "| Expected: 0");

    const offline = await presenceService.isUserOnline(userId);
    console.log("User offline:", offline, "| Expected: false");

    if (
      first !== 1 ||
      second !== 2 ||
      !online ||
      remaining !== 1 ||
      !stillOnline ||
      last !== 0 ||
      offline
    ) {
      throw new Error("Presence smoke test failed.");
    }

    console.log("[PASS] Redis presence smoke test passed.");
  } finally {
    await closeRedis();
  }
}

run().catch((error) => {
  console.error("[FAIL]", error);
  process.exitCode = 1;
});
