
const { prisma } = require("../../../config/database");
const { calculateSectionBand } = require("./score-calculation.service");

async function saveObjectiveSectionScore({
    attemptId,
    section,
    db = prisma,
}) {
    if (!attemptId) {
        throw new Error("Attempt ID is required.");
    }

    if (!["LISTENING", "READING"].includes(section)) {
        throw new Error(
            "Only Listening and Reading scores can be saved here."
        );
    }

    // Calculate the section score using the supplied database client.
    const sectionResult = await calculateSectionBand({
        attemptId,
        section,
        db,
    });

    const attempt = await db.attempt.findUnique({
        where: { id: attemptId },
        select: {
            id: true,
            userId: true,
            usageType: true,
            status: true,
        },
    });

    if (!attempt) {
        throw new Error("Attempt not found.");
    }

    if (!["SUBMITTED", "AUTO_SUBMITTED"].includes(attempt.status)) {
        throw new Error(
            "Attempt must be submitted before saving its score."
        );
    }

    const scoreSnapshot = {
        [section.toLowerCase()]: {
            rawScore: sectionResult.rawScore,
            maximumScore: sectionResult.maximumScore,
            totalQuestions: sectionResult.totalQuestions,
            band: sectionResult.band,
            conversionVersion: sectionResult.conversionVersion,
        },
    };

    if (attempt.usageType === "FULL_MOCK") {
        const existing = await db.mockScore.findUnique({
            where: { attemptId },
            select: {
                scoreSnapshot: true,
            },
        });

        const previousSnapshot =
            existing?.scoreSnapshot &&
            typeof existing.scoreSnapshot === "object" &&
            !Array.isArray(existing.scoreSnapshot)
                ? existing.scoreSnapshot
                : {};

        const updatedSnapshot = {
            ...previousSnapshot,
            ...scoreSnapshot,
        };

        return db.mockScore.upsert({
            where: { attemptId },

            create: {
                attemptId,
                userId: attempt.userId,
                listeningBand:
                    section === "LISTENING" ? sectionResult.band : null,
                readingBand:
                    section === "READING" ? sectionResult.band : null,
                scoreSnapshot: updatedSnapshot,
            },

            update: {
                ...(section === "LISTENING"
                    ? { listeningBand: sectionResult.band }
                    : { readingBand: sectionResult.band }),
                scoreSnapshot: updatedSnapshot,
            },
        });
    }

    if (attempt.usageType === "PRACTICE") {
        const existing = await db.practiceResult.findUnique({
            where: { attemptId },
            select: {
                scoreSnapshot: true,
            },
        });

        const previousSnapshot =
            existing?.scoreSnapshot &&
            typeof existing.scoreSnapshot === "object" &&
            !Array.isArray(existing.scoreSnapshot)
                ? existing.scoreSnapshot
                : {};

        return db.practiceResult.upsert({
            where: { attemptId },

            create: {
                attemptId,
                userId: attempt.userId,
                scoreSnapshot: {
                    ...previousSnapshot,
                    ...scoreSnapshot,
                },
            },

            update: {
                scoreSnapshot: {
                    ...previousSnapshot,
                    ...scoreSnapshot,
                },
            },
        });
    }

    throw new Error("Unsupported attempt usage type.");
}

module.exports = {
    saveObjectiveSectionScore,
};
