const express = require("express");

const { requireAuth } = require("../../../middleware/auth.middleware");

const {requireStudentInvitationAccess,requireInstituteAdminOnly} = require("../middleware/membership.middleware");

const {createInvitation,createBulkInvitations,listInvitations,resendInvitation,cancelInvitation,approveInvitation,rejectInvitation} = require("../controllers/student-invitation.controller");

const router = express.Router({ mergeParams: true });

router.use(requireAuth);
router.use(requireStudentInvitationAccess);

// Send one student invitation
router.post("/", createInvitation);

// Send bulk student invitations
router.post("/bulk", createBulkInvitations);


// List student invitations
router.get("/", listInvitations);

// Resend a student invitation
router.post("/:id/resend", resendInvitation);

// Cancel a student invitation
router.patch("/:id/cancel", cancelInvitation);

router.patch("/:id/approve", requireInstituteAdminOnly, approveInvitation);
router.patch("/:id/reject", requireInstituteAdminOnly, rejectInvitation);


module.exports = router;
