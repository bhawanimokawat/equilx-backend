const express = require("express");
const mockController = require("../controllers/mock.controller");
const { requireAuth } = require("../../../middleware/auth.middleware");

const router = express.Router();

// Public: browse published mock tests
router.get("/tests", mockController.listMockTests);
router.get("/tests/:testId", mockController.getMockTestDetails);

// Protected: start a mock attempt
router.post( "/tests/:testVersionId/start", requireAuth, mockController.startMockAttempt);

// Protected: current user's mock history
router.get("/history",requireAuth,mockController.getMockHistory);
router.get("/history/:attemptId",requireAuth, mockController.getMockHistoryItem);

module.exports = router;