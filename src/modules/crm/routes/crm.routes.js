
const express = require("express");

const { requireAuth } = require("../../../middleware/auth.middleware");
const { requireCrmAccess } = require("../middleware/crm.middleware");

const {
    createLead,
    listLeads,
    getLeadById,
    updateLead,
    deleteLead,
    updateLeadStatus,
    getLeadStatusHistory,
    assignLead,
    getLeadAssignmentHistory,
    listAssignableUsers,
    createLeadFollowUpHandler,
    listLeadFollowUpsHandler,
    completeLeadFollowUpHandler,
    cancelLeadFollowUpHandler,
    createLeadActivityHandler,
    listLeadActivitiesHandler,
    createLeadSourceHandler,
    listLeadSourcesHandler,
    updateLeadSourceHandler,
    exportLeadsCsvHandler,
    importLeadsCsvHandler,
} = require("../controllers/crm.controller");

const router = express.Router({ mergeParams: true });

// Authentication and authorization
router.use(requireAuth);
router.use(requireCrmAccess);

// Lead management
router.post("/leads", createLead);
router.get("/leads", listLeads);

// Static routes BEFORE dynamic :leadId routes
router.get("/leads/assignable-users", listAssignableUsers);
router.get("/leads/export", exportLeadsCsvHandler);

// Dynamic lead routes
router.get("/leads/:leadId", getLeadById);
router.patch("/leads/:leadId", updateLead);
router.delete("/leads/:leadId", deleteLead);

// Pipeline management
router.patch("/leads/:leadId/status", updateLeadStatus);
router.get("/leads/:leadId/status-history", getLeadStatusHistory);

// Assignment
router.patch("/leads/:leadId/assignment", assignLead);
router.get("/leads/:leadId/assignment-history", getLeadAssignmentHistory);

// Follow-ups
router.post("/leads/:leadId/follow-ups", createLeadFollowUpHandler);
router.get("/follow-ups", listLeadFollowUpsHandler);
router.patch("/follow-ups/:followUpId/complete", completeLeadFollowUpHandler);
router.patch("/follow-ups/:followUpId/cancel", cancelLeadFollowUpHandler);

// Activities
router.post("/leads/:leadId/activities", createLeadActivityHandler);
router.get("/leads/:leadId/activities", listLeadActivitiesHandler);

// Lead sources
router.post("/lead-sources", createLeadSourceHandler);
router.get("/lead-sources", listLeadSourcesHandler);
router.patch("/lead-sources/:sourceId", updateLeadSourceHandler);

// CSV import
router.post("/leads/import", importLeadsCsvHandler);

module.exports = router;
