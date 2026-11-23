
const express = require("express");

const planController = require("../controllers/plan.controller");

const { requireAuth } = require("../../../middleware/auth.middleware");
const { requireSuperAdmin } = require("../../../middleware/role.middleware");

const router = express.Router();

// --------------------------------------------------
// Public plan routes
// --------------------------------------------------

// GET /api/v1/plans
router.get("/", planController.listPlans);

// --------------------------------------------------
// Super Admin plan management routes
// --------------------------------------------------

const adminRouter = express.Router();

adminRouter.use(requireAuth, requireSuperAdmin);

// GET /api/v1/plans/admin
adminRouter.get("/", planController.listAdminPlans);

// POST /api/v1/plans/admin
adminRouter.post("/", planController.createPlan);

// GET /api/v1/plans/admin/:planId
adminRouter.get("/:planId", planController.getAdminPlanById);

// PATCH /api/v1/plans/admin/:planId
adminRouter.patch("/:planId", planController.updatePlan);

// PATCH /api/v1/plans/admin/:planId/status
adminRouter.patch("/:planId/status", planController.updatePlanStatus);

// POST /api/v1/plans/admin/:planId/versions
adminRouter.post("/:planId/versions", planController.createPlanVersion);

// Mount admin routes BEFORE the dynamic public route
router.use("/admin", adminRouter);

// GET /api/v1/plans/:code
router.get("/:code", planController.getPlanByCode);

module.exports = router;
