const { conversionTableSchema, } = require("../validation/score.validation");
const { markingRuleSchema, acceptedAnswersSchema, } = require("../validation/marking.validation");
const { prisma } = require("../../../config/database");


function convertRawScoreToBand(rawScore, conversionTable) {
    if (!Number.isInteger(rawScore) || rawScore < 0) {
        throw new Error("Raw score must be a non-negative integer.");
    }

    const table = conversionTableSchema.parse(conversionTable);

    if (rawScore > table.totalQuestions) {
        throw new Error("Raw score exceeds total questions.");
    }

    const matchingRow = table.rawScoreToBand.find(
        (row) => rawScore >= row.min && rawScore <= row.max
    );

    if (!matchingRow) {
        throw new Error(
            `No band conversion found for raw score ${rawScore}.`
        );
    }

    return matchingRow.band;
}



function normalizeAnswer(value, rule) {
    if (typeof value !== "string" && typeof value !== "number") {
        return value;
    }

    let normalized = String(value);

    if (rule.trimWhitespace) {
        normalized = normalized.trim();
    }

    if (!rule.caseSensitive) {
        normalized = normalized.toLowerCase();
    }

    return normalized;
}

function evaluateObjectiveAnswer({
    submittedAnswer,
    acceptedAnswers,
    markingRules,
}) {
    const rule = markingRuleSchema.parse(markingRules);
    const accepted = acceptedAnswersSchema.parse(acceptedAnswers);

    if (rule.type !== "EXACT_MATCH") {
        throw new Error("Unsupported marking rule.");
    }

    const normalizedSubmitted = normalizeAnswer(
        submittedAnswer,
        rule
    );

    const isCorrect = accepted.some((acceptedAnswer) => {
        const normalizedAccepted = normalizeAnswer(
            acceptedAnswer,
            rule
        );

        return normalizedSubmitted === normalizedAccepted;
    });

    return {
        isCorrect,
        awardedMarks: isCorrect ? rule.marks : 0,
        maximumMarks: rule.marks,
    };
}

async function calculateObjectiveSectionScore({
    attemptId,
    section,
    db = prisma,
}) {
    if (!["LISTENING", "READING"].includes(section)) {
        throw new Error("Only Listening and Reading can be scored here.");
    }

    const attempt = await db.attempt.findUnique({
        where: { id: attemptId },
        select: {
            id: true,
            status: true,
            testVersionId: true,
            answers: {
                select: {
                    questionId: true,
                    answer: true,
                },
            },
        },
    });

    if (!attempt) {
        throw new Error("Attempt not found.");
    }

    if (!["SUBMITTED", "AUTO_SUBMITTED"].includes(attempt.status)) {
        throw new Error("Attempt must be submitted before scoring.");
    }

    const questions = await db.question.findMany({
        where: {
            testPart: {
                testModule: {
                    testVersionId: attempt.testVersionId,
                    section,
                },
            },
        },
        select: {
            id: true,
            marks: true,
            answerKey: {
                select: {
                    acceptedAnswers: true,
                    markingRules: true,
                },
            },
        },
    });

    if (questions.length === 0) {
        throw new Error(`No ${section} questions found for this test.`);
    }

    const answerMap = new Map(
        attempt.answers.map((item) => [item.questionId, item.answer])
    );

    let rawScore = 0;
    let maximumScore = 0;

    for (const question of questions) {
        if (!question.answerKey) {
            throw new Error(
                `Answer key is missing for question ${question.id}.`
            );
        }

        if (!question.answerKey.markingRules) {
            throw new Error(
                `Marking rules are missing for question ${question.id}.`
            );
        }

        const questionMarks = Number(question.marks);

        if (!Number.isFinite(questionMarks) || questionMarks <= 0) {
            throw new Error(`Invalid marks for question ${question.id}.`);
        }

        if (questionMarks !== 1) {
            throw new Error(
                `Unsupported marks for IELTS objective question ${question.id}. Expected 1, received ${questionMarks}.`
            );
        }

        maximumScore += 1;

        const evaluation = evaluateObjectiveAnswer({
            submittedAnswer: answerMap.get(question.id),
            acceptedAnswers: question.answerKey.acceptedAnswers,
            markingRules: question.answerKey.markingRules,
        });

        if (evaluation.isCorrect) {
            rawScore += 1;
        }
    }

    return {
        section,
        rawScore,
        maximumScore,
        totalQuestions: questions.length,
    };
}
async function calculateSectionBand({
    attemptId,
    section,
    db = prisma,
}) {
    if (!["LISTENING", "READING"].includes(section)) {
        throw new Error(
            "Only Listening and Reading bands can be calculated here."
        );
    }

    const attempt = await db.attempt.findUnique({
        where: { id: attemptId },
        select: {
            id: true,
            testVersionId: true,
            status: true,
            testVersion: {
                select: {
                    test: {
                        select: {
                            category: true,
                        },
                    },
                },
            },
        },
    });

    if (!attempt) {
        throw new Error("Attempt not found.");
    }

    if (!["SUBMITTED", "AUTO_SUBMITTED"].includes(attempt.status)) {
        throw new Error("Attempt must be submitted before scoring.");
    }

    const conversion = await db.bandConversionVersion.findFirst({
        where: {
            testVersionId: attempt.testVersionId,
            section,
        },
        orderBy: {
            version: "desc",
        },
        select: {
            conversionTable: true,
            version: true,
        },
    });

    if (!conversion) {
        throw new Error(
            `Conversion table not found for ${section}.`
        );
    }

    const sectionScore = await calculateObjectiveSectionScore({
        attemptId,
        section,
        db,
    });

    const table = conversionTableSchema.parse(
        conversion.conversionTable
    );

    if (sectionScore.maximumScore !== table.totalQuestions) {
        throw new Error(
            "Question marks and conversion-table scale do not match."
        );
    }

    const band = convertRawScoreToBand(
        sectionScore.rawScore,
        conversion.conversionTable
    );

    return {
        ...sectionScore,
        band,
        conversionVersion: conversion.version,
        testCategory: attempt.testVersion.test.category,
    };
}
module.exports = {
    convertRawScoreToBand,
    evaluateObjectiveAnswer,
    calculateObjectiveSectionScore,
    calculateSectionBand,
};