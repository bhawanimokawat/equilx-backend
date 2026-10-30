const { prisma } = require("../../../config/database");
const {
  startAttempt,
} = require("../../attempts/services/attempt.service");

async function listMockTests({ page = 1, limit = 10, category } = {}) {
  const where = {
    status: "PUBLISHED",
    book: {
      isActive: true,
    },
    versions: {
      some: {
        status: "PUBLISHED",
      },
    },
    ...(category ? { category } : {}),
  };

  const [tests, total] = await prisma.$transaction([
    prisma.test.findMany({
      where,
      orderBy: [
        { testNumber: "asc" },
        { title: "asc" },
      ],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        testNumber: true,
        category: true,
        book: {
          select: {
            id: true,
            title: true,
            bookNumber: true,
          },
        },
        versions: {
          where: {
            status: "PUBLISHED",
          },
          orderBy: {
            version: "desc",
          },
          take: 1,
          select: {
            id: true,
            version: true,
            publishedAt: true,
          },
        },
      },
    }),
    prisma.test.count({ where }),
  ]);

  return {
    items: tests.map((test) => ({
      id: test.id,
      title: test.title,
      testNumber: test.testNumber,
      category: test.category,
      book: test.book,
      publishedVersion: test.versions[0] || null,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getMockTestDetails(testId) {
  const test = await prisma.test.findFirst({
    where: {
      id: testId,
      status: "PUBLISHED",
      book: {
        isActive: true,
      },
    },
    select: {
      id: true,
      title: true,
      testNumber: true,
      category: true,
      book: {
        select: {
          id: true,
          title: true,
          bookNumber: true,
        },
      },
      versions: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: {
          version: "desc",
        },
        take: 1,
        select: {
          id: true,
          version: true,
          publishedAt: true,
          modules: {
            orderBy: {
              position: "asc",
            },
            select: {
              id: true,
              section: true,
              position: true,
              durationSeconds: true,
              instructions: true,
              parts: {
                orderBy: {
                  position: "asc",
                },
                select: {
                  id: true,
                  title: true,
                  position: true,
                  instructions: true,
                  audioAssetKey: true,
                  groups: {
                    orderBy: {
                      position: "asc",
                    },
                    select: {
                      id: true,
                      title: true,
                      instructions: true,
                      passage: true,
                      position: true,
                      questions: {
                        orderBy: {
                          position: "asc",
                        },
                        select: {
                          id: true,
                          questionNumber: true,
                          questionType: true,
                          content: true,
                          marks: true,
                          position: true,
                        },
                      },
                    },
                  },
                  questions: {
                    where: {
                      questionGroupId: null,
                    },
                    orderBy: {
                      position: "asc",
                    },
                    select: {
                      id: true,
                      questionNumber: true,
                      questionType: true,
                      content: true,
                      marks: true,
                      position: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!test || test.versions.length === 0) {
    const error = new Error("Published mock test not found.");
    error.statusCode = 404;
    error.code = "MOCK_TEST_NOT_FOUND";
    throw error;
  }

  const publishedVersion = test.versions[0];

  return {
    id: test.id,
    title: test.title,
    testNumber: test.testNumber,
    category: test.category,
    book: test.book,
    publishedVersion,
  };
}

async function startMockAttempt({ userId, testVersionId }) {
  return startAttempt({
    userId,
    testVersionId,
    usageType: "FULL_MOCK",
  });
}

async function getMockHistory({ userId, page = 1, limit = 10 }) {
  const where = {
    userId,
    usageType: "FULL_MOCK",
  };

  const [attempts, total] = await prisma.$transaction([
    prisma.attempt.findMany({
      where,
      orderBy: {
        startedAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        status: true,
        startedAt: true,
        deadlineAt: true,
        submittedAt: true,
        createdAt: true,
        testVersion: {
          select: {
            id: true,
            version: true,
            test: {
              select: {
                id: true,
                title: true,
                testNumber: true,
                category: true,
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
            overallBand: true,
            completedAt: true,
          },
        },
      },
    }),
    prisma.attempt.count({ where }),
  ]);

  return {
    items: attempts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getMockHistoryItem({ userId, attemptId }) {
  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      userId,
      usageType: "FULL_MOCK",
    },
    select: {
      id: true,
      status: true,
      startedAt: true,
      deadlineAt: true,
      submittedAt: true,
      lastSavedAt: true,
      testVersion: {
        select: {
          id: true,
          version: true,
          test: {
            select: {
              id: true,
              title: true,
              testNumber: true,
              category: true,
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
      answers: {
        select: {
          questionId: true,
          answer: true,
          savedAt: true,
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
    },
  });

  if (!attempt) {
    const error = new Error("Mock attempt not found.");
    error.statusCode = 404;
    error.code = "MOCK_ATTEMPT_NOT_FOUND";
    throw error;
  }

  return attempt;
}

module.exports = {
  listMockTests,
  getMockTestDetails,
  startMockAttempt,
  getMockHistory,
  getMockHistoryItem,
};