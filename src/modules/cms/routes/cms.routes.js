const express = require("express");

const { requireAuth } = require("../../../middleware/auth.middleware");
const { requireSuperAdmin } = require("../../../middleware/role.middleware");

const { createBookHandler, listBooksHandler, getBookByIdHandler, updateBookHandler, createTestHandler, listTestsHandler, getTestByIdHandler, updateTestHandler, archiveTestHandler, createTestVersionHandler,
    getTestVersionByIdHandler, updateTestVersionHandler, createTestModuleHandler, getTestModuleByIdHandler, createTestPartHandler, getTestPartByIdHandler
    , updateTestPartHandler,createQuestionGroupHandler,getQuestionGroupByIdHandler,updateQuestionGroupHandler,
    createQuestionHandler,getQuestionByIdHandler,updateQuestionHandler,createAnswerKeyHandler,getAnswerKeyByIdHandler,updateAnswerKeyHandler,createBandConversionHandler,getBandConversionByIdHandler
,updateTestModuleHandler,bulkImportTestHandler,validateTestVersionHandler,publishTestVersionHandler} = require("../controllers/cms.controller");

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

router.post("/books", createBookHandler);
router.get("/books", listBooksHandler);
router.get("/books/:bookId", getBookByIdHandler);
router.patch("/books/:bookId", updateBookHandler);
router.post("/books/:bookId/tests", createTestHandler);
router.get("/books/:bookId/tests", listTestsHandler);
router.get("/tests/:testId", getTestByIdHandler);
router.patch("/tests/:testId", updateTestHandler);
router.patch("/tests/:testId/archive", archiveTestHandler);
router.post("/tests/:testId/versions", createTestVersionHandler);
router.get("/test-versions/:versionId", getTestVersionByIdHandler);
router.patch("/test-versions/:versionId", updateTestVersionHandler);
router.post("/test-modules", createTestModuleHandler);
router.get("/test-modules/:moduleId", getTestModuleByIdHandler);
router.post("/test-parts", createTestPartHandler);
router.get("/test-parts/:partId", getTestPartByIdHandler);
router.patch("/test-parts/:partId", updateTestPartHandler);
router.post("/question-groups", createQuestionGroupHandler);
router.get("/question-groups/:groupId", getQuestionGroupByIdHandler);
router.patch("/question-groups/:groupId", updateQuestionGroupHandler);
router.post("/questions", createQuestionHandler);
router.get("/questions/:questionId", getQuestionByIdHandler);
router.patch("/questions/:questionId", updateQuestionHandler);
router.post("/answer-keys", createAnswerKeyHandler);
router.get("/answer-keys/:answerKeyId", getAnswerKeyByIdHandler);
router.patch("/answer-keys/:answerKeyId", updateAnswerKeyHandler);
router.post("/band-conversions", createBandConversionHandler);
router.get( "/band-conversions/:conversionId", getBandConversionByIdHandler);
router.patch("/test-modules/:moduleId", updateTestModuleHandler);
router.post("/bulk-import", bulkImportTestHandler);
router.post("/test-versions/:versionId/validate",validateTestVersionHandler);
router.post( "/test-versions/:versionId/publish", publishTestVersionHandler);

module.exports = router;
