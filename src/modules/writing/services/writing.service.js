
const { prisma } = require("../../../config/database");
const { createAIJob } = require("../../ai/services/ai-job.service");
const { buildWritingPrompt } = require("../../ai/prompts/writing.prompt");


function createServiceError(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function calculateWordCount(text) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return 0;
  }

  return trimmedText.split(/\s+/).filter(Boolean).length;
}

function getTaskNumber(questionType) {
  if (questionType === "REPORT" || questionType === "LETTER") {
    return 1;
  }

  if (questionType === "ESSAY") {
    return 2;
  }

  return null;
}

function extractQuestionText(content) {
  if (!content || typeof content !== "object") {
    return null;
  }

  if (typeof content.task === "string") {
    return content.task;
  }

  return null;
}

async function submitWriting({
  userId,
  attemptId,
  taskNumber,
  responseText,
}) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
      401,
      "UNAUTHORIZED"
    );
  }

  const wordCount = calculateWordCount(responseText);

  if (wordCount === 0) {
    throw createServiceError(
      "Writing response cannot be empty.",
      400,
      "EMPTY_WRITING_RESPONSE"
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
      "Writing submission is not allowed for this attempt.",
      409,
      "ATTEMPT_NOT_ACTIVE"
    );
  }

  if (attempt.deadlineAt && new Date() > attempt.deadlineAt) {
    throw createServiceError(
      "The attempt deadline has passed.",
      409,
      "ATTEMPT_DEADLINE_EXPIRED"
    );
  }

  // 2. Build the Writing question filter.
  const questionWhere = {
    testPart: {
      testModule: {
        testVersionId: attempt.testVersionId,
        section: "WRITING",
      },
    },
  };

  // Practice attempts must remain inside their selected scope.
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

  // 3. Retrieve only Writing questions and their instructions.
  const questions = await prisma.question.findMany({
    where: questionWhere,
    select: {
      id: true,
      questionType: true,
      questionNumber: true,
      content: true,
      questionGroup: {
        select: {
          instructions: true,
        },
      },
      testPart: {
        select: {
          instructions: true,
        },
      },
    },
  });

  // 4. Identify the requested IELTS Writing task.
  const matchingQuestions = questions.filter(
    (question) => getTaskNumber(question.questionType) === taskNumber
  );

  if (matchingQuestions.length === 0) {
    throw createServiceError(
      `Writing Task ${taskNumber} is not available in this attempt.`,
      404,
      "WRITING_TASK_NOT_FOUND"
    );
  }

  if (matchingQuestions.length > 1) {
    throw createServiceError(
      "Multiple questions match this Writing task. Please contact support.",
      409,
      "AMBIGUOUS_WRITING_TASK"
    );
  }

  const question = matchingQuestions[0];
  const questionText = extractQuestionText(question.content);

  if (!questionText) {
    throw createServiceError(
      "Writing question content is invalid.",
      500,
      "INVALID_WRITING_QUESTION"
    );
  }

  // 5. Prevent duplicate submissions for the same task.
  const existingSubmission = await prisma.writingSubmission.findFirst({
    where: {
      attemptId,
      taskNumber,
    },
    select: {
      id: true,
    },
  });

  if (existingSubmission) {
    throw createServiceError(
      "A submission already exists for this Writing task.",
      409,
      "WRITING_ALREADY_SUBMITTED"
    );
  }

  // 6. Build the AI evaluation prompt from server-side question data.
  const promptData = buildWritingPrompt({
    taskNumber,
    question: questionText,
    responseText,
    wordCount,
  });

 // 7. Save the submission and pending evaluation.
let submission;

try {
  submission = await prisma.$transaction(async (tx) => {
    const savedSubmission = await tx.writingSubmission.create({
      data: {
        userId,
        attemptId,
        taskNumber,
        responseText,
        wordCount,
      },
    });

    await tx.writingEvaluation.create({
      data: {
        submissionId: savedSubmission.id,
        source: "AI",
        status: "PENDING",
        isFinal: false,
      },
    });

    return savedSubmission;
  });
} catch (error) {
  // Handle concurrent duplicate submissions.
  if (error.code === "P2002") {
    throw createServiceError(
      "A submission already exists for this Writing task.",
      409,
      "WRITING_ALREADY_SUBMITTED"
    );
  }

  throw error;
}
  // 8. Create the background AI job.
  try {
    const aiJob = await createAIJob({
      userId,
      jobType: "WRITING_EVALUATION",
      payload: {
        submissionId: submission.id,
        promptVersion: promptData.promptVersion,
      },
      maxAttempts: 3,
    });

    return {
      submission,
      evaluation: {
        status: "PENDING",
      },
      aiJob,
    };
  } catch (error) {
    // Preserve the submission and make the failed evaluation observable.
    await prisma.writingEvaluation.updateMany({
      where: {
        submissionId: submission.id,
        source: "AI",
        status: "PENDING",
      },
      data: {
        status: "FAILED",
      },
    });

    throw createServiceError(
      "Writing was saved, but AI evaluation could not be queued. Please try again later.",
      503,
      "AI_QUEUE_ENQUEUE_FAILED"
    );
  }
}

async function getMyWritingSubmissions({
  userId,
  page = 1,
  limit = 10,
  taskNumber,
  status,
}) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
      401,
      "UNAUTHORIZED"
    );
  }

  const where = {
    userId,
  };

  if (taskNumber) {
    where.taskNumber = taskNumber;
  }

  if (status) {
    where.evaluations = {
      some: {
        source: "AI",
        status,
      },
    };
  }

  const [submissions, total] = await prisma.$transaction([
    prisma.writingSubmission.findMany({
      where,
      select: {
        id: true,
        attemptId: true,
        taskNumber: true,
        wordCount: true,
        submittedAt: true,
        evaluations: {
          where: {
            source: "AI",
          },
          select: {
            id: true,
            status: true,
            overallBand: true,
            isFinal: true,
            evaluatedAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
      orderBy: {
        submittedAt: "desc",
      },
      skip: (page - 1) * limit,
      take: limit,
    }),

    prisma.writingSubmission.count({
      where,
    }),
  ]);

  return {
    submissions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getWritingSubmissionById({
  userId,
  submissionId,
}) {
  if (!userId) {
    throw createServiceError(
      "Authentication is required.",
      401,
      "UNAUTHORIZED"
    );
  }

  const submission = await prisma.writingSubmission.findFirst({
    where: {
      id: submissionId,
      userId,
    },
    select: {
      id: true,
      attemptId: true,
      taskNumber: true,
      responseText: true,
      wordCount: true,
      submittedAt: true,
      evaluations: {
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          source: true,
          status: true,
          taskResponseBand: true,
          coherenceBand: true,
          lexicalBand: true,
          grammarBand: true,
          overallBand: true,
          feedback: true,
          isFinal: true,
          evaluatedAt: true,
        },
      },
    },
  });

  if (!submission) {
    throw createServiceError(
      "Writing submission not found.",
      404,
      "WRITING_SUBMISSION_NOT_FOUND"
    );
  }

  return submission;
}

module.exports = {
  submitWriting,
  getMyWritingSubmissions,
  getWritingSubmissionById,
};
