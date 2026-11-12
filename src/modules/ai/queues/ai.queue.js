
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const aiConfig = require("../config/ai.config");
const env = require("../../../config/env");

const connection = new IORedis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
});

connection.on("error", (error) => {
  console.error("[AI QUEUE REDIS ERROR]", error.message);
});

const aiQueue = new Queue(aiConfig.queue.name, {
  connection,

  defaultJobOptions: {
    attempts: 5,

    backoff: aiConfig.queue.backoff,

    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 1000,
    },

    // Keep failed jobs for investigation.
    removeOnFail: false,
  },
});

async function addAIJob({
  jobType,
  jobId,
  data,
  maxAttempts = aiConfig.queue.attempts,
}) {
  if (!jobType || !jobId || !data) {
    throw new Error("Job type, job ID and job data are required.");
  }

  if (
    !Number.isInteger(maxAttempts) ||
    maxAttempts < 1 ||
    maxAttempts > 5
  ) {
    throw new Error("Invalid AI job retry limit.");
  }

  return aiQueue.add(jobType, data, {
    jobId,
    attempts: maxAttempts,
  });
}

async function closeAIQueue() {
  await aiQueue.close();
  await connection.quit();
}

module.exports = {
  aiQueue,
  addAIJob,
  closeAIQueue,
  connection,
};
