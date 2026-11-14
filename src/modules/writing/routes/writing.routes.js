const express = require("express");
const { requireAuth } = require("../../../middleware/auth.middleware");

const writingController = require("../controllers/writing.controller");

const router = express.Router();

// Submit a Writing Task response
router.post( "/attempts/:attemptId/submissions", requireAuth, writingController.submitWriting);

// Get the authenticated student's Writing submissions
router.get( "/submissions", requireAuth, writingController.getMyWritingSubmissions);

// Get a specific Writing submission and its evaluation
router.get( "/submissions/:submissionId", requireAuth, writingController.getWritingSubmissionById);

module.exports = router;
