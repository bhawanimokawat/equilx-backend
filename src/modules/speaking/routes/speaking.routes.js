const express = require("express");
const multer = require("multer");

const { requireAuth } = require("../../../middleware/auth.middleware");

const speakingController = require("../controllers/speaking.controller");

const { MAX_FILE_SIZE,
 ALLOWED_AUDIO_TYPES,
} = require("../storage/recording.storage");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    const mimeType = file.mimetype.toLowerCase().split(";")[0].trim();

    if (!ALLOWED_AUDIO_TYPES[mimeType]) {
      const error = new Error("Unsupported audio format.");
      error.statusCode = 400;
      error.code = "UNSUPPORTED_AUDIO_FORMAT";
      return callback(error);
    }

    callback(null, true);
  },
});

// All Speaking routes require authentication.
router.use(requireAuth);

// Create a Speaking submission.
router.post( "/attempts/:attemptId/submissions", speakingController.createSpeakingSubmission);

// Upload audio recording.
router.post( "/submissions/:submissionId/recordings", upload.single("recording"), speakingController.uploadSpeakingRecording);

// Complete submission and request AI evaluation.
router.post( "/submissions/:submissionId/complete", speakingController.completeSpeakingSubmission);

// Withdraw recording consent.
router.post("/submissions/:submissionId/withdraw-consent",speakingController.withdrawRecordingConsent);

module.exports = router;
