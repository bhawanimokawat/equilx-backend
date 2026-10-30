const { prisma } = require("../../../config/database");

function createServiceError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function startAttempt({ userId, testVersionId, usageType }) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
      401,
      "UNAUTHORIZED"
    );
  }

  const testVersion = await prisma.testVersion.findUnique({
    where: { id: testVersionId },
    select: {
      id: true,
      status: true,
      test: {
        select: {
          id: true,
          status: true,
          book: {
            select: {
              isActive: true,
            },
          },
        },
      },
    },
  });

  if (!testVersion) {
    throw createServiceError(
      "Test version not found.",
      404,
      "TEST_VERSION_NOT_FOUND"
    );
  }

  if (
    testVersion.status !== "PUBLISHED" ||
    testVersion.test.status !== "PUBLISHED" ||
    !testVersion.test.book.isActive
  ) {
    throw createServiceError(
      "This test is not available for attempts.",
      400,
      "TEST_NOT_AVAILABLE"
    );
  }

  const attempt = await prisma.attempt.create({
    data: {
      userId,
      testVersionId,
      usageType,
    },
    select: {
      id: true,
      testVersionId: true,
      usageType: true,
      status: true,
      startedAt: true,
      deadlineAt: true,
      createdAt: true,
    },
  });

  return attempt;
}



const now = new Date();

async function saveAnswer({
  userId,
  attemptId,
  questionId,
  answer,
}) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
      401,
      "UNAUTHORIZED"
    );
  }

  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const attempt = await tx.attempt.findFirst({
      where: {
        id: attemptId,
        userId,
      },
      select: {
        id: true,
        testVersionId: true,
        status: true,
        deadlineAt: true,
      },
    });

    if (!attempt) {
      throw createServiceError(
        "Attempt not found.",
        404,
        "ATTEMPT_NOT_FOUND"
      );
    }

    if (attempt.status !== "IN_PROGRESS") {
      throw createServiceError(
        "This attempt is no longer accepting answers.",
        400,
        "ATTEMPT_NOT_IN_PROGRESS"
      );
    }

    if (attempt.deadlineAt && now >= attempt.deadlineAt) {
      throw createServiceError(
        "The attempt deadline has passed.",
        400,
        "ATTEMPT_DEADLINE_PASSED"
      );
    }

    const question = await tx.question.findFirst({
      where: {
        id: questionId,
        testPart: {
          testModule: {
            testVersionId: attempt.testVersionId,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!question) {
      throw createServiceError(
        "Question does not belong to this attempt's test version.",
        400,
        "QUESTION_NOT_IN_TEST_VERSION"
      );
    }

    const savedAnswer = await tx.attemptAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      create: {
        attemptId,
        questionId,
        answer,
        firstSavedAt: now,
        lastSavedAt: now,
      },
      update: {
        answer,
        lastSavedAt: now,
      },
      select: {
        id: true,
        attemptId: true,
        questionId: true,
        answer: true,
        firstSavedAt: true,
        lastSavedAt: true,
      },
    });

    await tx.attempt.update({
      where: {
        id: attemptId,
      },
      data: {
        lastSavedAt: now,
      },
    });

    return savedAnswer;
  });
}
 
async function getMyAttempts({ userId }) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
      401,
      "UNAUTHORIZED"
    );
  }

  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
    },
    select: {
      id: true,
      testVersionId: true,
      usageType: true,
      status: true,
      startedAt: true,
      deadlineAt: true,
      submittedAt: true,
      lastSavedAt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return attempts;
}

async function getAttemptById({ userId, attemptId }) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
      401,
      "UNAUTHORIZED"
    );
  }

  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      userId,
    },
    select: {
      id: true,
      testVersionId: true,
      usageType: true,
      status: true,
      startedAt: true,
      deadlineAt: true,
      submittedAt: true,
      lastSavedAt: true,
      createdAt: true,
      answers: {
        select: {
          questionId: true,
          answer: true,
          firstSavedAt: true,
          lastSavedAt: true,
        },
      },
    },
  });

  if (!attempt) {
    throw createServiceError(
      "Attempt not found.",
      404,
      "ATTEMPT_NOT_FOUND"
    );
  }

  return attempt;
}


async function submitAttempt({ userId, attemptId }) {
    if (!userId) {
        throw createServiceError(
            "Authentication is required.",
            401,
            "UNAUTHORIZED"
        );
    }

    return prisma.$transaction(async (tx) => {
        // 1. Verify attempt ownership and current status.
        const attempt = await tx.attempt.findFirst({
            where: {
                id: attemptId,
                userId,
            },
            select: {
                id: true,
                status: true,
            },
        });

        if (!attempt) {
            throw createServiceError(
                "Attempt not found.",
                404,
                "ATTEMPT_NOT_FOUND"
            );
        }

        if (attempt.status !== "IN_PROGRESS") {
            throw createServiceError(
                "This attempt has already been submitted or is no longer active.",
                400,
                "ATTEMPT_NOT_IN_PROGRESS"
            );
        }

        const submittedAt = new Date();

        // 2. Submit only if the attempt is still IN_PROGRESS.
        // This prevents concurrent requests from submitting it twice.
        const updateResult = await tx.attempt.updateMany({
            where: {
                id: attemptId,
                userId,
                status: "IN_PROGRESS",
            },
            data: {
                status: "SUBMITTED",
                submittedAt,
            },
        });

        if (updateResult.count !== 1) {
            throw createServiceError(
                "This attempt has already been submitted or is no longer active.",
                400,
                "ATTEMPT_NOT_IN_PROGRESS"
            );
        }

        // 3. Calculate and save Listening and Reading scores.
        const listeningResult = await saveObjectiveSectionScore({
            attemptId,
            section: "LISTENING",
            db: tx,
        });

        const readingResult = await saveObjectiveSectionScore({
            attemptId,
            section: "READING",
            db: tx,
        });

        // 4. Return submission details.
        const submittedAttempt = await tx.attempt.findUnique({
            where: {
                id: attemptId,
            },
            select: {
                id: true,
                testVersionId: true,
                usageType: true,
                status: true,
                startedAt: true,
                submittedAt: true,
                deadlineAt: true,
            },
        });

        return {
            ...submittedAttempt,
            scoring: {
                listening: "COMPLETED",
                reading: "COMPLETED",
                writing: "PENDING",
                speaking: "PENDING",
            },
        };
    });
}


async function getAttemptAnswers({ userId, attemptId }) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
      401,
      "UNAUTHORIZED"
    );
  }

  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!attempt) {
    throw createServiceError(
      "Attempt not found.",
      404,
      "ATTEMPT_NOT_FOUND"
    );
  }

  const answers = await prisma.attemptAnswer.findMany({
    where: {
      attemptId,
    },
    select: {
      questionId: true,
      answer: true,
      firstSavedAt: true,
      lastSavedAt: true,
    },
    orderBy: {
      lastSavedAt: "asc",
    },
  });

  return answers;
}


async function getAttemptQuestions({ userId, attemptId }) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
      401,
      "UNAUTHORIZED"
    );
  }

  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      userId,
    },
    select: {
      id: true,
      testVersionId: true,
    },
  });

  if (!attempt) {
    throw createServiceError(
      "Attempt not found.",
      404,
      "ATTEMPT_NOT_FOUND"
    );
  }

  const questions = await prisma.question.findMany({
    where: {
      testPart: {
        testModule: {
          testVersionId: attempt.testVersionId,
        },
      },
    },
    select: {
      id: true,
      testPartId: true,
      questionGroupId: true,
      questionNumber: true,
      questionType: true,
      content: true,
      marks: true,
      position: true,
      testPart: {
        select: {
          id: true,
          title: true,
          position: true,
          testModule: {
            select: {
              section: true,
              position: true,
              durationSeconds: true,
            },
          },
        },
      },
    },
    orderBy: [
      { testPart: { testModule: { position: "asc" } } },
      { testPart: { position: "asc" } },
      { position: "asc" },
    ],
  });

  return questions;
}


async function getAttemptResult({ userId, attemptId }) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
      401,
      "UNAUTHORIZED"
    );
  }

  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      userId,
    },
    select: {
      id: true,
      usageType: true,
      status: true,
      submittedAt: true,
      mockScore: {
        select: {
          id: true,
          listeningBand: true,
          readingBand: true,
          writingBand: true,
          speakingBand: true,
          overallBand: true,
          scoreSnapshot: true,
          completedAt: true,
        },
      },
      practiceResult: {
        select: {
          id: true,
          scoreSnapshot: true,
          completedAt: true,
        },
      },
    },
  });

  if (!attempt) {
    throw createServiceError(
      "Attempt not found.",
      404,
      "ATTEMPT_NOT_FOUND"
    );
  }

  const result =
    attempt.usageType === "FULL_MOCK"
      ? attempt.mockScore
      : attempt.practiceResult;

  if (!result) {
    throw createServiceError(
      "Result is not available yet.",
      404,
      "RESULT_NOT_AVAILABLE"
    );
  }

  return {
    attemptId: attempt.id,
    usageType: attempt.usageType,
    status: attempt.status,
    submittedAt: attempt.submittedAt,
    result,
  };
}

module.exports = {
  startAttempt,
  saveAnswer,
  getMyAttempts,
  getAttemptById,
  submitAttempt,
  getAttemptAnswers,
  getAttemptQuestions,
  getAttemptResult,
};
