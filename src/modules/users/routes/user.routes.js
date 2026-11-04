const express = require("express");
const { requireAuth } = require("../../../middleware/auth.middleware");

const { getMyProfile, updateMyProfile, getMySecurity,listUsers,updateUserStatus} = require("../controllers/user.controller");
const { requireSuperAdmin } = require("../../../middleware/role.middleware");
 

const router = express.Router();

router.get("/me", requireAuth, getMyProfile);
router.patch("/me", requireAuth, updateMyProfile);
router.get("/me/security", requireAuth, getMySecurity);
router.get("/", requireAuth, requireSuperAdmin, listUsers);
router.patch("/:id/status",requireAuth,requireSuperAdmin,updateUserStatus);

module.exports = router;
