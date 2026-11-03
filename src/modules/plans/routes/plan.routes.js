const express = require("express");
const planController = require("../controllers/plan.controller");

const router = express.Router();

// GET /api/v1/plans
router.get("/", planController.listPlans);

// GET /api/v1/plans/:code
router.get("/:code", planController.getPlanByCode);

module.exports = router;
