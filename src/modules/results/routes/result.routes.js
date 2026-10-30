const express = require("express");
const resultController = require("../controllers/result.controller");
const { requireAuth } = require("../../../middleware/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, resultController.listResults);

router.get( "/:attemptId", requireAuth, resultController.getResultByAttemptId);

module.exports = router;