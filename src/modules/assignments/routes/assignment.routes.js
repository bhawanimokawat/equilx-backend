const express = require("express");
const router = express.Router();

const assignmentController = require("../controllers/assignment.controller");
const { requireAuth } = require("../../../middleware/auth.middleware");

// All assignment routes require authentication.
// Institute membership and role authorization are checked in the service layer.
router.use(requireAuth);

// Manager routes
router.post( "/:instituteId/assignments", assignmentController.createAssignment);
router.get( "/:instituteId/assignments", assignmentController.listAssignments);
router.get("/:instituteId/assignments/:assignmentId",assignmentController.getAssignmentById);
router.patch( "/:instituteId/assignments/:assignmentId", assignmentController.updateAssignment);
router.post("/:instituteId/assignments/:assignmentId/publish",assignmentController.publishAssignment);
router.post( "/:instituteId/assignments/:assignmentId/close", assignmentController.closeAssignment);
router.post("/:instituteId/assignments/:assignmentId/cancel",assignmentController.cancelAssignment);
router.get( "/:instituteId/assignments/:assignmentId/targets", assignmentController.listAssignmentTargets);
router.delete( "/:instituteId/assignments/:assignmentId", assignmentController.deleteAssignment);

// Institute student routes
router.get("/:instituteId/my-assignments",assignmentController.listMyAssignments);
router.get( "/:instituteId/my-assignments/:assignmentId", assignmentController.getMyAssignmentById);
router.post("/:instituteId/my-assignments/:assignmentId/contents/:contentId/start",assignmentController.startAssignmentAttempt);
router.post("/:instituteId/my-assignments/:assignmentId/completions/:completionId/submit",assignmentController.submitAssignmentAttempt);
router.get("/:instituteId/assignments/:assignmentId/progress",assignmentController.getAssignmentProgress);
router.get( "/:instituteId/assignments/:assignmentId/submissions", assignmentController.getAssignmentSubmissions);




module.exports = router;