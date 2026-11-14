
const { randomUUID } = require("node:crypto");

const { prisma } = require("../../../config/database");
const { addAIJob } = require("../queues/ai.queue");

const ALLOWED_JOB_TYPES = [
    "WRITING_EVALUATION",
    "SPEAKING_EVALUATION",
    "TRANSCRIPTION",
    "FEEDBACK_GENERATION",
];

async function createAIJob({
    userId,
    jobType,
    payload,
    maxAttempts = 3,
}) {
    if (!ALLOWED_JOB_TYPES.includes(jobType)) {
        throw new Error("Unsupported AI job type.");
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("A valid AI job payload is required.");
    }

    if (
        !Number.isInteger(maxAttempts) ||
        maxAttempts < 1 ||
        maxAttempts > 5
    ) {
        throw new Error("AI job maxAttempts must be between 1 and 5.");
    }

    // Only reference IDs and non-sensitive metadata are allowed.
    const allowedFields = {
        WRITING_EVALUATION: ["submissionId", "promptVersion"],
        SPEAKING_EVALUATION: ["submissionId", "promptVersion"],
        TRANSCRIPTION: ["recordingId"],
        FEEDBACK_GENERATION: ["submissionId", "promptVersion"],
    };

    const allowed = allowedFields[jobType];

    const invalidFields = Object.keys(payload).filter(
        (key) => !allowed.includes(key)
    );

    if (invalidFields.length > 0) {
        throw new Error(
            "AI job payload contains unsupported or sensitive fields."
        );
    }

    const requiredId =
        jobType === "TRANSCRIPTION" ? payload.recordingId : payload.submissionId;

    if (typeof requiredId !== "string" || !requiredId.trim()) {
        throw new Error("A valid resource ID is required for this AI job.");
    }

    const aiJobId = randomUUID();

    // Store only references and metadata in PostgreSQL.
    const aiJob = await prisma.aIJob.create({
        data: {
            id: aiJobId,
            userId: userId || null,
            jobType,
            status: "QUEUED",
            inputPayload: payload,
            maxAttempts,
        },
    });

    try {
        // Redis receives only the database job ID.
        await addAIJob({
            jobType,
            jobId: aiJobId,
            data: {
                aiJobId,
            },
            maxAttempts,
        });
        return {
            id: aiJob.id,
            jobType: aiJob.jobType,
            status: aiJob.status,
            createdAt: aiJob.createdAt,
        };
    } catch (error) {
        await prisma.aIJob.update({
            where: { id: aiJobId },
            data: {
                status: "FAILED",
                errorCode: "AI_QUEUE_ENQUEUE_FAILED",
                completedAt: new Date(),
            },
        });

        throw new Error("Failed to enqueue AI job.", {
            cause: error,
        });
    }
}

async function getAIJobById({ aiJobId, userId }) {
    if (!aiJobId || !userId) {
        throw new Error("AI job ID and user ID are required.");
    }

    return prisma.aIJob.findFirst({
        where: {
            id: aiJobId,
            userId,
        },
        select: {
            id: true,
            jobType: true,
            status: true,
            resultPayload: true,
            errorCode: true,
            attempts: true,
            maxAttempts: true,
            startedAt: true,
            completedAt: true,
            createdAt: true,
        },
    });
}

module.exports = {
    createAIJob,
    getAIJobById,
};
