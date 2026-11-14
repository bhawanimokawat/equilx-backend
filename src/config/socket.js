const { Server } = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");

const { initializeRedis } = require("./redis");
const {authenticateChatSocket,} = require("../modules/chat/socket/chat.authorization");
const { registerChatSocketHandlers,} = require("../modules/chat/socket/chat.socket");

async function initializeSocket(httpServer) {
  const { pubClient, subClient } = await initializeRedis();

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ["GET", "POST", "PATCH", "DELETE"],
      credentials: true,
    },
  });

  // Enable communication between multiple Node.js instances.
  io.adapter(createAdapter(pubClient, subClient));

  // Authenticate every socket connection.
  io.use(authenticateChatSocket);

  // Register chat event handlers.
  registerChatSocketHandlers(io);

  console.log("[SOCKET.IO] Initialized with Redis Adapter.");

  return io;
}

module.exports = { initializeSocket };
