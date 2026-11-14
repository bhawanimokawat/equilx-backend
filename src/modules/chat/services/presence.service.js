
const { getRedisClients } = require("../../../config/redis");

const PRESENCE_PREFIX = "equilx:presence:user:";
const PRESENCE_TTL_SECONDS = 90;

function getPresenceKey(userId) {
  return `${PRESENCE_PREFIX}${userId}`;
}

const ADD_OR_REFRESH_SCRIPT = `
  local time = redis.call("TIME")
  local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)
  local expiresAt = now + (tonumber(ARGV[2]) * 1000)

  redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", now)
  redis.call("ZADD", KEYS[1], expiresAt, ARGV[1])
  redis.call("EXPIRE", KEYS[1], tonumber(ARGV[2]) + 30)

  return redis.call("ZCARD", KEYS[1])
`;

const REMOVE_SOCKET_SCRIPT = `
  local time = redis.call("TIME")
  local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)

  redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", now)
  redis.call("ZREM", KEYS[1], ARGV[1])

  local remaining = redis.call("ZCARD", KEYS[1])

  if remaining == 0 then
    redis.call("DEL", KEYS[1])
  end

  return remaining
`;

const CHECK_ONLINE_SCRIPT = `
  local time = redis.call("TIME")
  local now = (tonumber(time[1]) * 1000) + math.floor(tonumber(time[2]) / 1000)

  redis.call("ZREMRANGEBYSCORE", KEYS[1], "-inf", now)

  local remaining = redis.call("ZCARD", KEYS[1])

  if remaining == 0 then
    redis.call("DEL", KEYS[1])
  end

  return remaining
`;

async function addSocket(userId, socketId) {
  const { pubClient } = getRedisClients();

  return pubClient.eval(ADD_OR_REFRESH_SCRIPT, {
    keys: [getPresenceKey(userId)],
    arguments: [socketId, String(PRESENCE_TTL_SECONDS)],
  });
}

async function refreshSocket(userId, socketId) {
  return addSocket(userId, socketId);
}

async function removeSocket(userId, socketId) {
  const { pubClient } = getRedisClients();

  return pubClient.eval(REMOVE_SOCKET_SCRIPT, {
    keys: [getPresenceKey(userId)],
    arguments: [socketId],
  });
}

async function isUserOnline(userId) {
  const { pubClient } = getRedisClients();

  const count = await pubClient.eval(CHECK_ONLINE_SCRIPT, {
    keys: [getPresenceKey(userId)],
    arguments: [],
  });

  return count > 0;
}

async function getUsersPresence(userIds) {
  const uniqueIds = [...new Set(userIds)];

  return Promise.all(
    uniqueIds.map(async (userId) => ({
      userId,
      online: await isUserOnline(userId),
    }))
  );
}

module.exports = {
  addSocket,
  refreshSocket,
  removeSocket,
  isUserOnline,
  getUsersPresence,
};
