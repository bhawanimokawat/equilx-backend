const express = require("express");

const { requireAuth } = require("../../../middleware/auth.middleware");
const { requireInstituteAdmin,} = require("../middleware/membership.middleware");

const { createMembership, listMemberships, getMembershipById, updateMembership,} = require("../controllers/membership.controller");

const router = express.Router();

router.use(requireAuth);

router.post( "/:instituteId/memberships", requireInstituteAdmin, createMembership);
router.get( "/:instituteId/memberships", requireInstituteAdmin, listMemberships);
router.get( "/:instituteId/memberships/:id", requireInstituteAdmin, getMembershipById);
router.patch( "/:instituteId/memberships/:id", requireInstituteAdmin, updateMembership);



module.exports = router;
