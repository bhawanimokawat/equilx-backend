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

// Authenticate first, then authorize institute-level CRM access.
router.use(requireAuth);
router.use(requireCrmAccess);

// Lead management
router.post("/leads", createLead);
router.get("/leads", listLeads);
router.get("/leads/:leadId", getLeadById);
router.patch("/leads/:leadId", updateLead);
router.delete("/leads/:leadId", deleteLead);

// Pipeline management
router.patch("/leads/:leadId/status", updateLeadStatus);
router.get("/leads/:leadId/status-history", getLeadStatusHistory);


//assgiment


router.patch("/leads/:leadId/assignment", assignLead);
router.get("/leads/:leadId/assignment-history", getLeadAssignmentHistory);
router.get("/leads/assignable-users", listAssignableUsers);



//leads

router.post("/leads/:leadId/follow-ups", createLeadFollowUpHandler);
router.get("/follow-ups", listLeadFollowUpsHandler);
router.patch("/follow-ups/:followUpId/complete", completeLeadFollowUpHandler);
router.patch("/follow-ups/:followUpId/cancel", cancelLeadFollowUpHandler);



// activity

router.post(  "/leads/:leadId/activities",  createLeadActivityHandler);
router.get( "/leads/:leadId/activities", listLeadActivitiesHandler);



router.post("/lead-sources", createLeadSourceHandler);
router.get("/lead-sources", listLeadSourcesHandler);
router.patch( "/lead-sources/:sourceId", updateLeadSourceHandler);




router.get("/leads/export", exportLeadsCsvHandler);
router.post("/leads/import", importLeadsCsvHandler);


module.exports = router;
