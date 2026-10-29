const express = require("express");

const { requireAuth } = require("../../../middleware/auth.middleware");
const { requireSuperAdmin } = require("../../../middleware/role.middleware");

const {  createOrganization,  listOrganizations,  getOrganizationById,  updateOrganization,  listOrganizationMembers,} = require("../controllers/organization.controller");

const router = express.Router();

// All organization endpoints require authentication and Super Admin access.
router.use(requireAuth, requireSuperAdmin);
router.post("/", createOrganization);
router.get("/", listOrganizations);
router.get("/:id/members", listOrganizationMembers);
router.get("/:id", getOrganizationById);
router.patch("/:id", updateOrganization);

module.exports = router;
