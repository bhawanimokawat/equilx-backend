const express = require("express");

const { requireAuth } = require("../../../middleware/auth.middleware");
const { startAttempt,saveAnswer,getMyAttempts,getAttemptById,submitAttempt,getAttemptResult,getAttemptAnswers,getAttemptQuestions} = require("../controllers/attempt.controller");

const router = express.Router();

// Start a new attempt (authenticated user only)
router.post("/", requireAuth, startAttempt);
router.put( "/:attemptId/answers/:questionId", requireAuth, saveAnswer);
router.get("/", requireAuth, getMyAttempts);
router.get("/:attemptId", requireAuth, getAttemptById);
router.post( "/:attemptId/submit",requireAuth,submitAttempt);
router.get( "/:attemptId/answers", requireAuth, getAttemptAnswers);
router.get( "/:attemptId/questions", requireAuth, getAttemptQuestions);
router.get( "/:attemptId/result", requireAuth,getAttemptResult);

module.exports = router;
