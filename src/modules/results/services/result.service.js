
const { prisma } = require("../../../config/database");

function createServiceError(
  message,
  statusCode = 400,
  code = "RESULT_ERROR"
) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function formatAttemptResult(attempt) {
  const result =
    attempt.usageType === "FULL_MOCK"
      ? attempt.mockScore
      : attempt.practiceResult;

  return {
    attemptId: attempt.id,
    usageType: attempt.usageType,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    test: attempt.testVersion.test,
    result,
    resultStatus: result ? "COMPLETED" : "PENDING",
  };
}

async function listMyResults({
  userId,
  page = 1,
  limit = 10,
  usageType,
} = {}) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
      401,
      "UNAUTHORIZED"
    );
  }

  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(usageType ? { usageType } : {}),
    status: {
      in: ["SUBMITTED", "AUTO_SUBMITTED"],
    },
  };

  const [attempts, total] = await prisma.$transaction([
    prisma.attempt.findMany({
      where,
      orderBy: {
        submittedAt: "desc",
      },
      skip,
      take: limit,
      select: {
        id: true,
        usageType: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        testVersion: {
          select: {
            version: true,
            test: {
              select: {
                id: true,
                title: true,
                category: true,
                testNumber: true,
                book: {
                  select: {
                    title: true,
                    bookNumber: true,
                  },
                },
              },
            },
          },
        },
        mockScore: {
          select: {
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
            scoreSnapshot: true,
            completedAt: true,
          },
        },
      },
    }),

    prisma.attempt.count({ where }),
  ]);

  return {
    results: attempts.map(formatAttemptResult),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getMyResultByAttemptId({
  userId,
  attemptId,
} = {}) {
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
      status: {
        in: ["SUBMITTED", "AUTO_SUBMITTED"],
      },
    },
    select: {
      id: true,
      usageType: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      testVersion: {
        select: {
          version: true,
          test: {
            select: {
              id: true,
              title: true,
              category: true,
              testNumber: true,
              book: {
                select: {
                  title: true,
                  bookNumber: true,
                },
              },
            },
          },
          modules: {
            orderBy: {
              position: "asc",
            },
            select: {
              id: true,
              section: true,
              durationSeconds: true,
              position: true,
            },
          },
        },
      },
      mockScore: {
        select: {
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
          scoreSnapshot: true,
          completedAt: true,
        },
      },
    },
  });

  if (!attempt) {
    throw createServiceError(
      "Result not found.",
      404,
      "RESULT_NOT_FOUND"
    );
  }

  return {
    ...formatAttemptResult(attempt),
    modules: attempt.testVersion.modules,
  };
}

module.exports = {
  listMyResults,
  getMyResultByAttemptId,
};
