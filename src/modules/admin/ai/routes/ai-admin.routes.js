const express = require("express");

const {
  requireAuth,
} = require("../../../../middleware/auth.middleware");

const {
  requireSuperAdmin,
} = require("../../../../middleware/role.middleware");

const controller = require("../controllers/ai-admin-model.controller");
const promptController = require("../controllers/ai-admin-prompt.controller");
const settingsController = require("../controllers/ai-admin-settings.controller");
const usageController = require("../controllers/ai-admin-usage.controller");
const qualityController = require("../controllers/ai-admin-quality.controller");

const router = express.Router();

router.use(requireAuth, requireSuperAdmin);

// AI Models
router.get("/models", controller.listModels);
router.post("/models", controller.createModel);
router.patch("/models/:modelId", controller.updateModel);

// AI Model Routing
router.post("/routes", controller.createRoute);
router.patch("/routes/:routeId", controller.updateRoute);
router.delete("/routes/:routeId", controller.deleteRoute);



// AI Prompt Management
router.get("/prompts", promptController.listPrompts);
router.get("/prompts/:promptKey", promptController.getPromptHistory);
router.post("/prompts", promptController.createPrompt);
router.patch("/prompts/:promptId", promptController.updatePromptDraft);
router.post("/prompts/:promptId/publish", promptController.publishPrompt);
router.post("/prompts/:promptId/rollback", promptController.rollbackPrompt);


// AI configuration
router.get("/config", settingsController.getConfig);
router.patch("/config", settingsController.updateConfig);

// AI limits
router.get("/limits", settingsController.getLimits);
router.patch("/limits", settingsController.updateLimits);




// AI usage analytics
router.get("/usage/summary", usageController.getSummary);
router.get("/usage/breakdown", usageController.getBreakdown);
router.get("/usage/trends", usageController.getTrends);
router.get("/usage/export", usageController.exportUsage);




router.get("/quality/summary", qualityController.getSummary);
router.get("/quality/breakdown", qualityController.getBreakdown);
router.get("/quality/trends", qualityController.getTrends);
module.exports = router;
