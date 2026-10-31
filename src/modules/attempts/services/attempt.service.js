const { prisma } = require("../../../config/database");

function createServiceError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

async function startAttempt({
  userId,
  testVersionId,
  usageType,
  moduleId,
  partId,
}) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
      401,
      "UNAUTHORIZED"
    );
  }

  if (!testVersionId || !["FULL_MOCK", "PRACTICE"].includes(usageType)) {
    throw createServiceError(
      "Invalid attempt details.",
      400,
      "INVALID_ATTEMPT_DETAILS"
    );
  }

  const hasModule = Boolean(moduleId);
  const hasPart = Boolean(partId);

  // Validate attempt scope.
  if (usageType === "FULL_MOCK" && (hasModule || hasPart)) {
    throw createServiceError(
      "Full mock attempts cannot have a module or part selection.",
      400,
      "INVALID_ATTEMPT_SCOPE"
    );
  }

  if (usageType === "PRACTICE" && hasModule === hasPart) {
    throw createServiceError(
      "Practice attempts require exactly one module or part.",
      400,
      "INVALID_ATTEMPT_SCOPE"
    );
  }

  // Fetch published test version and its module structure.
  const testVersion = await prisma.testVersion.findUnique({
    where: { id: testVersionId },
    select: {
      id: true,
      status: true,

      test: {
        select: {
          status: true,
          book: {
            select: {
              isActive: true,
            },
          },
        },
      },

      modules: {
        select: {
          id: true,
          section: true,
          durationSeconds: true,

          parts: {
            select: {
              id: true,
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

  const startedAt = new Date();
  let deadlineAt = null;

  // FULL MOCK: all four IELTS modules are required.
  if (usageType === "FULL_MOCK") {
    const requiredSections = [
      "LISTENING",
      "READING",
      "WRITING",
      "SPEAKING",
    ];

    const availableSections = testVersion.modules.map(
      (module) => module.section
    );

    const hasAllModules =
      testVersion.modules.length === 4 &&
      requiredSections.every((section) =>
        availableSections.includes(section)
      );

    if (!hasAllModules) {
      throw createServiceError(
        "This test does not contain all four IELTS modules.",
        400,
        "INCOMPLETE_TEST_MODULES"
      );
    }

    const hasInvalidDuration = testVersion.modules.some(
      (module) =>
        !Number.isInteger(module.durationSeconds) ||
        module.durationSeconds <= 0
    );

    if (hasInvalidDuration) {
      throw createServiceError(
        "Test module durations are invalid.",
        400,
        "INVALID_MODULE_DURATION"
      );
    }

    const totalDurationSeconds = testVersion.modules.reduce(
      (total, module) => total + module.durationSeconds,
      0
    );

    deadlineAt = new Date(
      startedAt.getTime() + totalDurationSeconds * 1000
    );
  }

  // PRACTICE: validate the selected module or part.
  if (usageType === "PRACTICE") {
    if (moduleId) {
      const selectedModule = testVersion.modules.find(
        (module) => module.id === moduleId
      );

      if (!selectedModule) {
        throw createServiceError(
          "Selected module does not belong to this test.",
          400,
          "INVALID_PRACTICE_MODULE"
        );
      }
    }

    if (partId) {
      const selectedPart = testVersion.modules
        .flatMap((module) => module.parts)
        .find((part) => part.id === partId);

      if (!selectedPart) {
        throw createServiceError(
          "Selected part does not belong to this test.",
          400,
          "INVALID_PRACTICE_PART"
        );
      }
    }

    // Practice is untimed by default.
    deadlineAt = null;
  }

  const attempt = await prisma.attempt.create({
    data: {
      userId,
      testVersionId,
      usageType,
      moduleId: moduleId || null,
      partId: partId || null,
      startedAt,
      deadlineAt,
    },

    select: {
      id: true,
      testVersionId: true,
      usageType: true,
      moduleId: true,
      partId: true,
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

  return prisma.$transaction(
    async (tx) => {
      // 1. Find the attempt belonging to this user.
      const attempt = await tx.attempt.findFirst({
        where: {
          id: attemptId,
          userId,
        },
        select: {
          id: true,
          testVersionId: true,
          moduleId: true,
          partId: true,
          usageType: true,
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

      // 2. Build question scope based on attempt type.
      const questionScope = {
        testPart: {
          testModule: {
            testVersionId: attempt.testVersionId,
          },
        },
      };

      if (attempt.usageType === "PRACTICE") {
        if (attempt.moduleId) {
          questionScope.testPart.testModule.id = attempt.moduleId;
        }

        if (attempt.partId) {
          questionScope.testPartId = attempt.partId;
        }
      }

      // 3. Verify that the question belongs to this attempt's scope.
      const question = await tx.question.findFirst({
        where: {
          id: questionId,
          ...questionScope,
        },
        select: {
          id: true,
        },
      });

      if (!question) {
        throw createServiceError(
          "Question does not belong to this attempt's selected content.",
          400,
          "QUESTION_NOT_IN_ATTEMPT_SCOPE"
        );
      }

      // 4. Atomically confirm the attempt is still accepting answers.
      // This also updates lastSavedAt.
      const updatedAttempt = await tx.attempt.updateMany({
        where: {
          id: attemptId,
          userId,
          status: "IN_PROGRESS",
          OR: [
            { deadlineAt: null },
            { deadlineAt: { gt: now } },
          ],
        },
        data: {
          lastSavedAt: now,
        },
      });

      if (updatedAttempt.count !== 1) {
        throw createServiceError(
          "The attempt is no longer accepting answers.",
          400,
          "ATTEMPT_NOT_ACCEPTING_ANSWERS"
        );
      }

      // 5. Create or update the student's answer.
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

      return savedAnswer;
    },
    {
      isolationLevel: "Serializable",
    }
  );
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
      moduleId: true,
      partId: true,
      status: true,
      startedAt: true,
      deadlineAt: true,
      submittedAt: true,
      lastSavedAt: true,
      createdAt: true,
    },

    orderBy: [
      { createdAt: "desc" },
      { id: "desc" },
    ],
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
      moduleId: true,
      partId: true,
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

  const now = new Date();

  return prisma.$transaction(
    async (tx) => {
      // 1. Verify attempt ownership and status.
      const attempt = await tx.attempt.findFirst({
        where: {
          id: attemptId,
          userId,
        },
        select: {
          id: true,
          testVersionId: true,
          usageType: true,
          moduleId: true,
          partId: true,
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
          "This attempt has already been submitted or is no longer active.",
          400,
          "ATTEMPT_NOT_IN_PROGRESS"
        );
      }

      // 2. Determine submission type.
      const isDeadlinePassed =
        attempt.deadlineAt && now >= attempt.deadlineAt;

      const finalStatus = isDeadlinePassed
        ? "AUTO_SUBMITTED"
        : "SUBMITTED";

      // 3. Update only if the attempt is still active.
      const updateResult = await tx.attempt.updateMany({
        where: {
          id: attemptId,
          userId,
          status: "IN_PROGRESS",
          OR: [
            { deadlineAt: null },
            { deadlineAt: { gt: now } },
            ...(isDeadlinePassed
              ? [{ deadlineAt: { lte: now } }]
              : []),
          ],
        },
        data: {
          status: finalStatus,
          submittedAt: now,
        },
      });

      if (updateResult.count !== 1) {
        throw createServiceError(
          "This attempt has already been submitted or is no longer active.",
          400,
          "ATTEMPT_NOT_IN_PROGRESS"
        );
      }

      // 4. Calculate existing objective scores for FULL_MOCK.
      if (attempt.usageType === "FULL_MOCK") {
        await saveObjectiveSectionScore({
          attemptId,
          section: "LISTENING",
          db: tx,
        });

        await saveObjectiveSectionScore({
          attemptId,
          section: "READING",
          db: tx,
        });
      }

      // 5. Retrieve final attempt details.
      const submittedAttempt = await tx.attempt.findFirst({
        where: {
          id: attemptId,
          userId,
        },
        select: {
          id: true,
          testVersionId: true,
          usageType: true,
          moduleId: true,
          partId: true,
          status: true,
          startedAt: true,
          submittedAt: true,
          deadlineAt: true,
        },
      });

      // 6. Return submission information.
      return {
        ...submittedAttempt,

        scoring:
          attempt.usageType === "FULL_MOCK"
            ? {
              listening: "COMPLETED",
              reading: "COMPLETED",
              writing: "PENDING",
              speaking: "PENDING",
            }
            : {
              practice: "PENDING",
            },
      };
    },
    {
      isolationLevel: "Serializable",
    }
  );
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
    orderBy: [
      { lastSavedAt: "asc" },
      { questionId: "asc" },
    ],
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

  // 1. Verify attempt ownership and retrieve its scope.
  const attempt = await prisma.attempt.findFirst({
    where: {
      id: attemptId,
      userId,
    },
    select: {
      id: true,
      testVersionId: true,
      usageType: true,
      moduleId: true,
      partId: true,
    },
  });

  if (!attempt) {
    throw createServiceError(
      "Attempt not found.",
      404,
      "ATTEMPT_NOT_FOUND"
    );
  }

  // 2. Build question filter.
  const questionWhere = {
    testPart: {
      testModule: {
        testVersionId: attempt.testVersionId,
      },
    },
  };

  // 3. Restrict practice questions to the selected scope.
  if (attempt.usageType === "PRACTICE") {
    if (attempt.moduleId) {
      questionWhere.testPart.testModule.id = attempt.moduleId;
    } else if (attempt.partId) {
      questionWhere.testPartId = attempt.partId;
    } else {
      throw createServiceError(
        "Practice attempt has no valid selected scope.",
        400,
        "INVALID_ATTEMPT_SCOPE"
      );
    }
  }

  // 4. Retrieve questions without answer keys.
  const questions = await prisma.question.findMany({
    where: questionWhere,

    select: {
      id: true,
      testPartId: true,
      questionGroupId: true,
      questionNumber: true,
      questionType: true,
      content: true,
      marks: true,
      position: true,

      questionGroup: {
        select: {
          id: true,
          title: true,
          instructions: true,
          passage: true,
          position: true,
        },
      },

      testPart: {
        select: {
          id: true,
          title: true,
          instructions: true,
          position: true,
          audioAssetKey: true,

          testModule: {
            select: {
              id: true,
              section: true,
              position: true,
              durationSeconds: true,
              instructions: true,
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
  if (!["SUBMITTED", "AUTO_SUBMITTED"].includes(attempt.status)) {
    throw createServiceError(
      "Attempt must be submitted before its result can be viewed.",
      400,
      "ATTEMPT_NOT_SUBMITTED"
    );
  }

  const result =
    attempt.usageType === "FULL_MOCK"
      ? attempt.mockScore
      : attempt.practiceResult;


  if (!result) {
    throw createServiceError(
      "Result is not available yet. Evaluation may still be pending.",
      409,
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
