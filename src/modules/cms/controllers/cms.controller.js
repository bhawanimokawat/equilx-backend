const { Prisma } = require("@prisma/client");
const { createBookSchema, updateBookSchema, bookIdParamSchema, listBooksQuerySchema, createTestSchema, listTestsQuerySchema,
   updateTestSchema, testIdParamSchema, createTestVersionSchema, testVersionIdParamSchema, updateTestVersionSchema,createTestModuleSchema, moduleIdParamSchema ,createTestPartSchema,testPartIdParamSchema,updateTestPartSchema,createQuestionGroupSchema,
   questionGroupIdParamSchema,updateQuestionGroupSchema,createQuestionSchema,questionIdParamSchema,updateQuestionSchema,createAnswerKeySchema,
   getAnswerKeyById,updateAnswerKeySchema,createBandConversionSchema,bandConversionIdParamSchema,updateTestModuleSchema,bulkImportTestSchema} = require("../validation/cms.validation");

const { createBook, listBooks, getBookById, updateBook, createTest, listTests, 
  getTestById, updateTest, archiveTest, getTestVersionById, updateTestVersion,createTestModule,getTestModuleById,createTestPart ,
  getTestPartById,updateTestPart,createQuestionGroup,getQuestionGroupById,updateQuestionGroup,createQuestion,getQuestionById,
  updateQuestion,createAnswerKey,answerKeyIdParamSchema,updateAnswerKey,createBandConversion,getBandConversionById,updateTestModule,bulkImportTest,publishTestVersion} = require("../services/cms.service");

function sendError(res, status, code, message) {
  return res.status(status).json({
    success: false,
    error: { code, message },
  });
}

function handleError(res, error, resource = "BOOK") {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      if (resource === "TEST") {
        return sendError(
          res,
          409,
          "DUPLICATE_TEST",
          "A test with these details already exists."
        );
      }

      return sendError(
        res,
        409,
        "DUPLICATE_BOOK",
        "A book with this title and category already exists."
      );
    }

    if (error.code === "P2025") {
      const isTest = resource === "TEST";

      return sendError(
        res,
        404,
        isTest ? "TEST_NOT_FOUND" : "BOOK_NOT_FOUND",
        isTest
          ? "The requested test was not found."
          : "The requested book was not found."
      );
    }
  }

  return sendError(
    res,
    500,
    "INTERNAL_SERVER_ERROR",
    "An unexpected error occurred."
  );
}

async function createBookHandler(req, res) {
  const parsed = createBookSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Please check the submitted book details."
    );
  }

  try {
    const book = await createBook(parsed.data);

    return res.status(201).json({
      success: true,
      data: { book },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function listBooksHandler(req, res) {
  const parsed = listBooksQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Please check the book-list filters."
    );
  }

  try {
    const result = await listBooks(parsed.data);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function getBookByIdHandler(req, res) {
  const parsed = bookIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "The book ID is invalid."
    );
  }

  try {
    const book = await getBookById(parsed.data.bookId);

    if (!book) {
      return sendError(
        res,
        404,
        "BOOK_NOT_FOUND",
        "The requested book was not found."
      );
    }

    return res.status(200).json({
      success: true,
      data: { book },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateBookHandler(req, res) {
  const params = bookIdParamSchema.safeParse(req.params);
  const body = updateBookSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Please check the book ID and submitted fields."
    );
  }

  try {
    const book = await updateBook(params.data.bookId, body.data);

    return res.status(200).json({
      success: true,
      data: { book },
    });
  } catch (error) {
    return handleError(res, error);
  }
}


async function createTestHandler(req, res) {
  const params = bookIdParamSchema.safeParse(req.params);
  const body = createTestSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Please check the book ID and submitted test details."
    );
  }

  try {
    const test = await createTest(params.data.bookId, body.data);

    return res.status(201).json({
      success: true,
      data: { test },
    });
  } catch (error) {
    if (error.code === "BOOK_INACTIVE") {
      return sendError(
        res,
        409,
        "BOOK_INACTIVE",
        "Cannot create a test under an inactive book."
      );
    }

    return handleError(res, error);
  }
}

async function listTestsHandler(req, res) {
  const params = bookIdParamSchema.safeParse(req.params);
  const query = listTestsQuerySchema.safeParse(req.query);

  if (!params.success || !query.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Please check the book ID and test-list filters."
    );
  }

  try {
    const result = await listTests(params.data.bookId, query.data);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.code === "BOOK_NOT_FOUND") {
      return sendError(
        res,
        404,
        "BOOK_NOT_FOUND",
        "The requested book was not found."
      );
    }

    return handleError(res, error);
  }
}

async function getTestByIdHandler(req, res) {
  const params = testIdParamSchema.safeParse(req.params);

  if (!params.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Please provide a valid test ID."
    );
  }

  try {
    const test = await getTestById(params.data.testId);

    if (!test) {
      return sendError(
        res,
        404,
        "TEST_NOT_FOUND",
        "The requested test was not found."
      );
    }

    return res.status(200).json({
      success: true,
      data: { test },
    });
  } catch (error) {
    return handleError(res, error);
  }
}

async function updateTestHandler(req, res) {
  const params = testIdParamSchema.safeParse(req.params);
  const body = updateTestSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Please check the test ID and submitted test details."
    );
  }

  try {
    const test = await updateTest(params.data.testId, body.data);

    return res.status(200).json({
      success: true,
      data: { test },
    });
  } catch (error) {
    if (error.code === "P2025") {
      return sendError(
        res,
        404,
        "TEST_NOT_FOUND",
        "The requested test was not found."
      );
    }

    if (error.code === "P2002") {
      return sendError(
        res,
        409,
        "DUPLICATE_TEST",
        "A test with these details already exists."
      );
    }

    return handleError(res, error);
  }
}

async function archiveTestHandler(req, res) {
  const params = testIdParamSchema.safeParse(req.params);

  if (!params.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Please provide a valid test ID."
    );
  }

  try {
    const test = await archiveTest(params.data.testId);

    return res.status(200).json({
      success: true,
      data: { test },
    });
  } catch (error) {
    if (error.code === "P2025") {
      return sendError(
        res,
        404,
        "TEST_NOT_FOUND",
        "The requested test was not found."
      );
    }

    return handleError(res, error);
  }
}


async function createTestVersionHandler(req, res) {
  const parsed = createTestVersionSchema.safeParse({
    testId: req.params.testId,
  });

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "A valid test ID is required."
    );
  }

  try {
    const version = await createTestVersion(parsed.data.testId);

    return res.status(201).json({
      success: true,
      data: version,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return sendError(
        res,
        409,
        "TEST_VERSION_CONFLICT",
        "A version with this number already exists. Please retry."
      );
    }

    return handleError(res, error, "TEST");
  }
}


async function getTestVersionByIdHandler(req, res) {
  const parsed = testVersionIdParamSchema.safeParse({
    versionId: req.params.versionId,
  });

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "A valid test version ID is required."
    );
  }

  try {
    const version = await getTestVersionById(
      parsed.data.versionId
    );

    if (!version) {
      return sendError(
        res,
        404,
        "TEST_VERSION_NOT_FOUND",
        "The requested test version was not found."
      );
    }

    return res.status(200).json({
      success: true,
      data: version,
    });
  } catch (error) {
    return handleError(res, error, "TEST");
  }
}

async function updateTestVersionHandler(req, res) {
  const params = testVersionIdParamSchema.safeParse({
    versionId: req.params.versionId,
  });

  if (!params.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "A valid test version ID is required."
    );
  }

  const body = updateTestVersionSchema.safeParse(req.body);

  if (!body.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "A valid test version status is required."
    );
  }

  try {
    const version = await updateTestVersion(
      params.data.versionId,
      body.data
    );

    return res.status(200).json({
      success: true,
      data: version,
    });
  } catch (error) {
    if (error.code === "TEST_VERSION_NOT_FOUND") {
      return sendError(
        res,
        404,
        "TEST_VERSION_NOT_FOUND",
        "The requested test version was not found."
      );
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return sendError(
        res,
        409,
        "TEST_VERSION_NOT_EDITABLE",
        "Only draft or in-review versions can be updated."
      );
    }

    return handleError(res, error, "TEST");
  }
}


async function createTestModuleHandler(req, res) {
  const parsed = createTestModuleSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid test module data."
    );
  }

  try {
    const module = await createTestModule(parsed.data);

    return res.status(201).json({
      success: true,
      data: module,
    });
  } catch (error) {
    if (error.code === "TEST_VERSION_NOT_FOUND") {
      return sendError(
        res,
        404,
        "TEST_VERSION_NOT_FOUND",
        "The requested test version was not found."
      );
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return sendError(
        res,
        409,
        "TEST_VERSION_NOT_EDITABLE",
        error.message
      );
    }

    if (error.code === "P2002") {
      return sendError(
        res,
        409,
        "DUPLICATE_TEST_MODULE",
        "This section or position already exists in the test version."
      );
    }

    return handleError(res, error, "TEST");
  }
}

async function getTestModuleByIdHandler(req, res) {
  const parsed = moduleIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid module ID."
    );
  }

  try {
    const module = await getTestModuleById(parsed.data.moduleId);

    if (!module) {
      return sendError(
        res,
        404,
        "TEST_MODULE_NOT_FOUND",
        "The requested test module was not found."
      );
    }

    return res.status(200).json({
      success: true,
      data: module,
    });
  } catch (error) {
    return handleError(res, error, "TEST");
  }
}


async function createTestPartHandler(req, res) {
  const parsed = createTestPartSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid test part data."
    );
  }

  try {
    const part = await createTestPart(parsed.data);

    return res.status(201).json({
      success: true,
      data: part,
    });
  } catch (error) {
    if (error.code === "TEST_MODULE_NOT_FOUND") {
      return sendError(
        res,
        404,
        "TEST_MODULE_NOT_FOUND",
        "The requested test module was not found."
      );
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return sendError(
        res,
        409,
        "TEST_VERSION_NOT_EDITABLE",
        error.message
      );
    }

    if (error.code === "P2002") {
      return sendError(
        res,
        409,
        "DUPLICATE_TEST_PART_POSITION",
        "A part with this position already exists in the module."
      );
    }

    return handleError(res, error, "TEST");
  }
}

async function getTestPartByIdHandler(req, res) {
  const parsed = testPartIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid test part ID."
    );
  }

  try {
    const part = await getTestPartById(parsed.data.partId);

    if (!part) {
      return sendError(
        res,
        404,
        "TEST_PART_NOT_FOUND",
        "The requested test part was not found."
      );
    }

    return res.status(200).json({
      success: true,
      data: part,
    });
  } catch (error) {
    return handleError(res, error, "TEST");
  }
}



async function updateTestPartHandler(req, res) {
  const params = testPartIdParamSchema.safeParse(req.params);

  if (!params.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid test part ID."
    );
  }

  const body = updateTestPartSchema.safeParse(req.body);

  if (!body.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid test part update data."
    );
  }

  try {
    const part = await updateTestPart(
      params.data.partId,
      body.data
    );

    return res.status(200).json({
      success: true,
      data: part,
    });
  } catch (error) {
    if (error.code === "TEST_PART_NOT_FOUND") {
      return sendError(
        res,
        404,
        "TEST_PART_NOT_FOUND",
        "The requested test part was not found."
      );
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return sendError(
        res,
        409,
        "TEST_VERSION_NOT_EDITABLE",
        error.message
      );
    }

    if (
      error.code === "P2002" ||
      error.code === "P2003"
    ) {
      return sendError(
        res,
        409,
        "TEST_PART_CONFLICT",
        "The update conflicts with existing test content."
      );
    }

    return handleError(res, error, "TEST");
  }
}


async function createQuestionGroupHandler(req, res) {
  const parsed = createQuestionGroupSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid question group data."
    );
  }

  try {
    const group = await createQuestionGroup(parsed.data);

    return res.status(201).json({
      success: true,
      data: group,
    });
  } catch (error) {
    if (error.code === "TEST_PART_NOT_FOUND") {
      return sendError(
        res,
        404,
        "TEST_PART_NOT_FOUND",
        "The requested test part was not found."
      );
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return sendError(
        res,
        409,
        "TEST_VERSION_NOT_EDITABLE",
        error.message
      );
    }

    if (error.code === "P2002") {
      return sendError(
        res,
        409,
        "DUPLICATE_QUESTION_GROUP_POSITION",
        "A question group with this position already exists in the part."
      );
    }

    return handleError(res, error, "TEST");
  }
}


async function getQuestionGroupByIdHandler(req, res) {
  const parsed = questionGroupIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid question group ID."
    );
  }

  try {
    const group = await getQuestionGroupById(parsed.data.groupId);

    if (!group) {
      return sendError(
        res,
        404,
        "QUESTION_GROUP_NOT_FOUND",
        "The requested question group was not found."
      );
    }

    return res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    return handleError(res, error, "TEST");
  }
}


async function updateQuestionGroupHandler(req, res) {
  const params = questionGroupIdParamSchema.safeParse(req.params);

  if (!params.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid question group ID."
    );
  }

  const body = updateQuestionGroupSchema.safeParse(req.body);

  if (!body.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid question group update data."
    );
  }

  try {
    const group = await updateQuestionGroup(
      params.data.groupId,
      body.data
    );

    return res.status(200).json({
      success: true,
      data: group,
    });
  } catch (error) {
    if (error.code === "QUESTION_GROUP_NOT_FOUND") {
      return sendError(
        res,
        404,
        "QUESTION_GROUP_NOT_FOUND",
        "The requested question group was not found."
      );
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return sendError(
        res,
        409,
        "TEST_VERSION_NOT_EDITABLE",
        error.message
      );
    }

    if (error.code === "P2002") {
      return sendError(
        res,
        409,
        "DUPLICATE_QUESTION_GROUP_POSITION",
        "A group with this position already exists in the part."
      );
    }

    return handleError(res, error, "TEST");
  }
}



async function createQuestionHandler(req, res) {
  const parsed = createQuestionSchema.safeParse(req.body);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid question data."
    );
  }

  try {
    const question = await createQuestion(parsed.data);

    return res.status(201).json({
      success: true,
      data: question,
    });
  } catch (error) {
    if (error.code === "TEST_PART_NOT_FOUND") {
      return sendError(
        res,
        404,
        "TEST_PART_NOT_FOUND",
        "The requested test part was not found."
      );
    }

    if (error.code === "QUESTION_GROUP_NOT_FOUND") {
      return sendError(
        res,
        404,
        "QUESTION_GROUP_NOT_FOUND",
        "The requested question group was not found."
      );
    }

    if (error.code === "QUESTION_GROUP_PART_MISMATCH") {
      return sendError(
        res,
        400,
        "QUESTION_GROUP_PART_MISMATCH",
        error.message
      );
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return sendError(
        res,
        409,
        "TEST_VERSION_NOT_EDITABLE",
        error.message
      );
    }

    if (error.code === "P2002") {
      return sendError(
        res,
        409,
        "DUPLICATE_QUESTION",
        "A question with this number or position already exists."
      );
    }

    return handleError(res, error, "TEST");
  }
}


async function getQuestionByIdHandler(req, res) {
  const parsed = questionIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid question ID."
    );
  }

  try {
    const question = await getQuestionById(parsed.data.questionId);

    if (!question) {
      return sendError(
        res,
        404,
        "QUESTION_NOT_FOUND",
        "The requested question was not found."
      );
    }

    return res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    return handleError(res, error, "TEST");
  }
}


async function updateQuestionHandler(req, res) {
  const params = questionIdParamSchema.safeParse(req.params);
  const body = updateQuestionSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid question ID or request data."
    );
  }

  try {
    const question = await updateQuestion(
      params.data.questionId,
      body.data
    );

    return res.status(200).json({
      success: true,
      message: "Question updated successfully.",
      data: question,
    });
  } catch (error) {
    if (error.code === "QUESTION_NOT_FOUND") {
      return sendError(
        res, 404, "QUESTION_NOT_FOUND",
        "The requested question was not found."
      );
    }

    if (error.code === "QUESTION_GROUP_NOT_FOUND") {
      return sendError(
        res, 404, "QUESTION_GROUP_NOT_FOUND",
        "The requested question group was not found."
      );
    }

    if (error.code === "QUESTION_GROUP_PART_MISMATCH") {
      return sendError(
        res, 400, "QUESTION_GROUP_PART_MISMATCH",
        "The question group must belong to the same test part."
      );
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return sendError(
        res, 409, "TEST_VERSION_NOT_EDITABLE",
        "Only questions in draft test versions can be updated."
      );
    }

    if (error.code === "P2002") {
      return sendError(
        res, 409, "DUPLICATE_QUESTION",
        "A question with these details already exists."
      );
    }

    return handleError(res, error, "QUESTION");
  }
}




async function createAnswerKeyHandler(req, res) {
  const body = createAnswerKeySchema.safeParse(req.body);

  if (!body.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid answer key data."
    );
  }

  try {
    const answerKey = await createAnswerKey(body.data);

    return res.status(201).json({
      success: true,
      message: "Answer key created successfully.",
      data: answerKey,
    });
  } catch (error) {
    if (error.code === "QUESTION_NOT_FOUND") {
      return sendError(
        res,
        404,
        "QUESTION_NOT_FOUND",
        "The requested question was not found."
      );
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return sendError(
        res,
        409,
        "TEST_VERSION_NOT_EDITABLE",
        "Answer keys can only be created for draft test versions."
      );
    }

    if (error.code === "P2002") {
      return sendError(
        res,
        409,
        "ANSWER_KEY_EXISTS",
        "An answer key already exists for this question."
      );
    }

    return handleError(res, error, "ANSWER_KEY");
  }
}



async function getAnswerKeyByIdHandler(req, res) {
  const params = answerKeyIdParamSchema.safeParse(req.params);

  if (!params.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid answer key ID."
    );
  }

  try {
    const answerKey = await getAnswerKeyById(
      params.data.answerKeyId
    );

    if (!answerKey) {
      return sendError(
        res,
        404,
        "ANSWER_KEY_NOT_FOUND",
        "The requested answer key was not found."
      );
    }

    return res.status(200).json({
      success: true,
      data: answerKey,
    });
  } catch (error) {
    return handleError(res, error, "ANSWER_KEY");
  }
}



async function updateAnswerKeyHandler(req, res) {
  const params = answerKeyIdParamSchema.safeParse(req.params);
  const body = updateAnswerKeySchema.safeParse(req.body);

  if (!params.success || !body.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid answer key ID or request data."
    );
  }

  try {
    const answerKey = await updateAnswerKey(
      params.data.answerKeyId,
      body.data
    );

    return res.status(200).json({
      success: true,
      message: "Answer key updated successfully.",
      data: answerKey,
    });
  } catch (error) {
    if (error.code === "ANSWER_KEY_NOT_FOUND") {
      return sendError(
        res,
        404,
        "ANSWER_KEY_NOT_FOUND",
        "The requested answer key was not found."
      );
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return sendError(
        res,
        409,
        "TEST_VERSION_NOT_EDITABLE",
        "Only answer keys in draft test versions can be updated."
      );
    }

    return handleError(res, error, "ANSWER_KEY");
  }
}



async function createBandConversionHandler(req, res) {
  const body = createBandConversionSchema.safeParse(req.body);

  if (!body.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid band conversion data."
    );
  }

  try {
    const conversion = await createBandConversion(body.data);

    return res.status(201).json({
      success: true,
      message: "Band conversion created successfully.",
      data: conversion,
    });
  } catch (error) {
    if (error.code === "TEST_VERSION_NOT_FOUND") {
      return sendError(
        res,
        404,
        "TEST_VERSION_NOT_FOUND",
        "The requested test version was not found."
      );
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return sendError(
        res,
        409,
        "TEST_VERSION_NOT_EDITABLE",
        "Band conversions can only be added to draft test versions."
      );
    }

    if (error.code === "P2002") {
      return sendError(
        res,
        409,
        "BAND_CONVERSION_CONFLICT",
        "A conversion with this version and section already exists."
      );
    }

    return handleError(res, error, "BAND_CONVERSION");
  }
}



async function getBandConversionByIdHandler(req, res) {
  const params = bandConversionIdParamSchema.safeParse(req.params);

  if (!params.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid band conversion ID."
    );
  }

  try {
    const conversion = await getBandConversionById(
      params.data.conversionId
    );

    if (!conversion) {
      return sendError(
        res,
        404,
        "BAND_CONVERSION_NOT_FOUND",
        "The requested band conversion was not found."
      );
    }

    return res.status(200).json({
      success: true,
      data: conversion,
    });
  } catch (error) {
    return handleError(res, error, "BAND_CONVERSION");
  }
}



async function updateTestModuleHandler(req, res) {
  const params = moduleIdParamSchema.safeParse(req.params);
  const body = updateTestModuleSchema.safeParse(req.body);

  if (!params.success || !body.success) {
    return sendError(
      res,
      400,
      "VALIDATION_ERROR",
      "Invalid module ID or request data."
    );
  }

  try {
    const testModule = await updateTestModule(
      params.data.moduleId,
      body.data
    );

    return res.status(200).json({
      success: true,
      message: "Test module updated successfully.",
      data: testModule,
    });
  } catch (error) {
    if (error.code === "TEST_MODULE_NOT_FOUND") {
      return sendError(
        res,
        404,
        "TEST_MODULE_NOT_FOUND",
        "The requested test module was not found."
      );
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return sendError(
        res,
        409,
        "TEST_VERSION_NOT_EDITABLE",
        "Only modules in draft test versions can be updated."
      );
    }

    if (error.code === "P2002") {
      return sendError(
        res,
        409,
        "TEST_MODULE_CONFLICT",
        "A module with this position or section already exists."
      );
    }

    return handleError(res, error, "TEST_MODULE");
  }
}


async function bulkImportTestHandler(req, res) {
  try {
    const validation = bulkImportTestSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid bulk-import data.",
          details: validation.error.issues,
        },
      });
    }

    const result = await bulkImportTest(validation.data);

    return res.status(201).json({
      success: true,
      message: "Test content imported successfully.",
      data: result,
    });
  } catch (error) {
    if (error.code === "TEST_VERSION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    if (error.code === "TEST_VERSION_NOT_EDITABLE") {
      return res.status(409).json({
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
      });
    }

    return sendError(res, error);
  }
}



async function validateTestVersionHandler(req, res, next) {
  try {
    const result = await cmsService.validateTestVersion(
      req.params.versionId
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error.code === "TEST_VERSION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
}


async function publishTestVersionHandler(req, res, next) {
  try {
    const result = await cmsService.publishTestVersion(
      req.params.versionId
    );

    return res.status(200).json({
      success: true,
      message: "Test version published successfully.",
      data: result,
    });
  } catch (error) {
    if (error.code === "TEST_VERSION_NOT_FOUND") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === "TEST_VERSION_VALIDATION_FAILED") {
      return res.status(422).json({
        success: false,
        message: error.message,
        errors: error.details,
      });
    }

    return next(error);
  }
}

module.exports = {
  createBookHandler,
  listBooksHandler,
  getBookByIdHandler,
  updateBookHandler,
  createTestHandler,
  listTestsHandler,
  getTestByIdHandler,
  updateTestHandler,
  archiveTestHandler,
  createTestVersionHandler,
  getTestVersionByIdHandler,
  updateTestVersionHandler,
  createTestModuleHandler,
  getTestModuleByIdHandler,
  createTestPartHandler,
  getTestPartByIdHandler,
  updateTestPartHandler,
  createQuestionGroupHandler,
  getQuestionGroupByIdHandler,
  updateQuestionGroupHandler,
  createQuestionHandler,
  getQuestionByIdHandler,
  updateQuestionHandler,
  createAnswerKeyHandler,
  getAnswerKeyByIdHandler,
  updateAnswerKeyHandler,
  createBandConversionHandler,
  getBandConversionByIdHandler,
  updateTestModuleHandler,
  bulkImportTestHandler,
  validateTestVersionHandler,
  publishTestVersionHandler,
};

