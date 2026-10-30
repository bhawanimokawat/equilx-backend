const attemptService = require("../services/attempt.service");
const { startAttemptSchema,saveAnswerSchema,attemptIdParamSchema,questionIdParamSchema} = require("../validations/attempt.validation");

async function startAttempt(req, res, next) {
  try {
    const validation = startAttemptSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Please provide a valid test version ID and usage type.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    // Assumes your authentication middleware sets req.user.id.
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const attempt = await attemptService.startAttempt({
      userId,
      ...validation.data,
    });

    return res.status(201).json({
      success: true,
      message: "Attempt started successfully.",
      data: { attempt },
    });
  } catch (error) {
    next(error);
  }
}

async function saveAnswer(req, res, next) {
  try {
    const attemptValidation = attemptIdParamSchema.safeParse({
      attemptId: req.params.attemptId,
    });

    const questionValidation = questionIdParamSchema.safeParse({
      attemptId: req.params.attemptId,
      questionId: req.params.questionId,
    });

    const answerValidation = saveAnswerSchema.safeParse(req.body);

    const validationErrors = [
      ...(!attemptValidation.success
        ? attemptValidation.error.issues
        : []),
      ...(!questionValidation.success
        ? questionValidation.error.issues
        : []),
      ...(!answerValidation.success
        ? answerValidation.error.issues
        : []),
    ];

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Invalid attempt, question, or answer.",
        errors: validationErrors.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const savedAnswer = await attemptService.saveAnswer({
      userId,
      attemptId: req.params.attemptId,
      questionId: req.params.questionId,
      answer: answerValidation.data.answer,
    });

    return res.status(200).json({
      success: true,
      message: "Answer saved successfully.",
      data: { answer: savedAnswer },
    });
  } catch (error) {
    next(error);
  }
}


async function getMyAttempts(req, res, next) {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const attempts = await attemptService.getMyAttempts({
      userId,
    });

    return res.status(200).json({
      success: true,
      message: "Attempts retrieved successfully.",
      data: {
        attempts,
        count: attempts.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAttemptById(req, res, next) {
  try {
    const validation = attemptIdParamSchema.safeParse({
      attemptId: req.params.attemptId,
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Invalid attempt ID.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const attempt = await attemptService.getAttemptById({
      userId,
      attemptId: validation.data.attemptId,
    });

    return res.status(200).json({
      success: true,
      message: "Attempt retrieved successfully.",
      data: { attempt },
    });
  } catch (error) {
    next(error);
  }
}

async function submitAttempt(req, res, next) {
  try {
    const validation = attemptIdParamSchema.safeParse({
      attemptId: req.params.attemptId,
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Invalid attempt ID.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const attempt = await attemptService.submitAttempt({
      userId,
      attemptId: validation.data.attemptId,
    });

    return res.status(200).json({
      success: true,
      message: "Attempt submitted successfully.",
      data: { attempt },
    });
  } catch (error) {
    next(error);
  }
}

async function getAttemptAnswers(req, res, next) {
  try {
    const validation = attemptIdParamSchema.safeParse({
      attemptId: req.params.attemptId,
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Invalid attempt ID.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const answers = await attemptService.getAttemptAnswers({
      userId,
      attemptId: validation.data.attemptId,
    });

    return res.status(200).json({
      success: true,
      message: "Saved answers retrieved successfully.",
      data: {
        answers,
        count: answers.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getAttemptQuestions(req, res, next) {
  try {
    const validation = attemptIdParamSchema.safeParse({
      attemptId: req.params.attemptId,
    });

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Invalid attempt ID.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        code: "UNAUTHORIZED",
        message: "Authentication is required.",
      });
    }

    const questions = await attemptService.getAttemptQuestions({
      userId,
      attemptId: validation.data.attemptId,
    });

    return res.status(200).json({
      success: true,
      message: "Attempt questions retrieved successfully.",
      data: {
        questions,
        count: questions.length,
      },
    });
  } catch (error) {
    next(error);
  }
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
  getAttemptResult
};
