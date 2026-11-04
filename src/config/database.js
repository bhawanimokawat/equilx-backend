
const { PrismaClient } = require("@prisma/client");
const pino = require("pino");

const logger = pino({
  name: "equilx-database",
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
          },
        }
      : undefined,
});

const prisma = new PrismaClient({
  log:
    process.env.NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"],
});

async function connectDatabase() {
  try {
    await prisma.$connect();
    await prisma.$queryRaw`SELECT 1`;

    logger.info("PostgreSQL connected successfully");
  } catch (error) {
    logger.error(
      { err: error },
      "PostgreSQL connection failed"
    );

    throw error;
  }
}

async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info("PostgreSQL disconnected");
}

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
};
