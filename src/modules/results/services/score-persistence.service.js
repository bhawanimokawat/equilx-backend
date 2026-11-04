const { prisma } = require("../../../config/database");

const {
    calculateSectionBand,
    calculateObjectiveSectionScore,
} = require("./score-calculation.service");

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

    // Fetch and validate the attempt first.
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

    // Calculate according to the attempt type.
    let sectionResult;

    if (attempt.usageType === "FULL_MOCK") {
        sectionResult = await calculateSectionBand({
            attemptId,
            section,
            db,
        });
    } else if (attempt.usageType === "PRACTICE") {
        sectionResult = await calculateObjectiveSectionScore({
            attemptId,
            section,
            db,
        });
    } else {
        throw new Error("Unsupported attempt usage type.");
    }

    // Build the score snapshot.
    const sectionSnapshot = {
        rawScore: sectionResult.rawScore,
        maximumScore: sectionResult.maximumScore,
        totalQuestions: sectionResult.totalQuestions,
    };

    // Only full mock results receive a section band here.
    if (attempt.usageType === "FULL_MOCK") {
        sectionSnapshot.band = sectionResult.band;
        sectionSnapshot.conversionVersion =
            sectionResult.conversionVersion;
    }

    const scoreSnapshot = {
        [section.toLowerCase()]: sectionSnapshot,
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
                    section === "LISTENING"
                        ? sectionResult.band
                        : null,
                readingBand:
                    section === "READING"
                        ? sectionResult.band
                        : null,
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

        const updatedSnapshot = {
            ...previousSnapshot,
            ...scoreSnapshot,
        };

        return db.practiceResult.upsert({
            where: { attemptId },

            create: {
                attemptId,
                userId: attempt.userId,
                scoreSnapshot: updatedSnapshot,
            },

            update: {
                scoreSnapshot: updatedSnapshot,
            },
        });
    }

    throw new Error("Unsupported attempt usage type.");
}

module.exports = {
    saveObjectiveSectionScore,
};