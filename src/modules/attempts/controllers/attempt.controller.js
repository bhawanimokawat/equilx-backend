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
  testVersionId: validation.data.testVersionId,
  usageType: validation.data.usageType,
  moduleId: validation.data.moduleId,
  partId: validation.data.partId,
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
    const questionValidation = questionIdParamSchema.safeParse({
      attemptId: req.params.attemptId,
      questionId: req.params.questionId,
    });

    const answerValidation = saveAnswerSchema.safeParse(req.body);

    const validationErrors = [
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
      attemptId: questionValidation.data.attemptId,
      questionId: questionValidation.data.questionId,
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


async function getAttemptResult(req, res, next) {
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

    const result = await attemptService.getAttemptResult({
      userId,
      attemptId: validation.data.attemptId,
    });

    return res.status(200).json({
      success: true,
      message: "Attempt result retrieved successfully.",
      data: { result },
    });
  } catch (error) {
    next(error);
  }
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
