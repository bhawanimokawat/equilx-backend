
const express = require("express");

const {
  requireAuth,
  requireSuperAdmin,
} = require("../../../middleware/auth.middleware");

const controller = require(
  "../controllers/material.controller"
);

const router = express.Router();

// All authenticated users can read published materials.
router.use(requireAuth);

router.get("/", controller.listMaterials);
router.get("/bookmarks", controller.listBookmarks);
router.get("/:materialId", controller.getMaterial);

router.post(
  "/:materialId/bookmark",
  controller.addBookmark
);

router.delete(
  "/:materialId/bookmark",
  controller.removeBookmark
);

// Only Super Admin can manage materials.
router.post(
  "/",
  requireSuperAdmin,
  controller.createMaterial
);

router.patch(
  "/:materialId",
  requireSuperAdmin,
  controller.updateMaterial
);

router.patch(
  "/:materialId/publish",
  requireSuperAdmin,
  controller.publishMaterial
);

router.patch(
  "/:materialId/archive",
  requireSuperAdmin,
  controller.archiveMaterial
);

module.exports = router;
