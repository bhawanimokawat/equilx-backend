const express = require("express");

const { requireAuth } = require("../../../middleware/auth.middleware");

const {acceptInvitation,} = require("../controllers/student-invitation.controller");

const router = express.Router();

router.use(requireAuth);

// Accept an institute invitation
router.post("/accept", acceptInvitation);

module.exports = router;
