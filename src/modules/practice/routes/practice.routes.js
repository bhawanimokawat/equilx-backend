const express = require("express");
const practiceController = require("../controllers/practice.controller");
const { requireAuth } = require("../../../middleware/auth.middleware");

const router = express.Router();

// Public: browse published practice content
router.get("/tests", practiceController.listPracticeTests);
router.get("/tests/:testId", practiceController.getPracticeTestDetails);

// Protected: start a practice attempt
router.post("/tests/:testVersionId/start",requireAuth,practiceController.startPracticeAttempt);

// Protected: practice history
router.get("/history",requireAuth,practiceController.getPracticeHistory);
router.get( "/history/:attemptId", requireAuth, practiceController.getPracticeHistoryItem);

module.exports = router;