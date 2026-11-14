const express = require("express");

const batchController = require("../controllers/batch.controller");
const { requireAuth } = require("../../../middleware/auth.middleware");
const { validate } = require("../../../middleware/validate.middleware");

const {
  createBatchSchema,
  updateBatchSchema,
  batchIdSchema,
  listBatchesSchema,
  addBatchMembersSchema,
  removeBatchMemberSchema,
  listBatchMembersSchema,
  myBatchesSchema,
} = require("../validations/batch.validation");

const router = express.Router();

router.use(requireAuth);

// Student's own batches
router.get( "/:instituteId/batches/my", validate(myBatchesSchema), batchController.listMyBatches);

// Create and list batches
router.post("/:instituteId/batches",validate(createBatchSchema),batchController.createBatch);
router.get( "/:instituteId/batches", validate(listBatchesSchema), batchController.listBatches);

// Batch details and management
router.get("/:instituteId/batches/:batchId",validate(batchIdSchema),batchController.getBatchById);
router.patch("/:instituteId/batches/:batchId",validate(updateBatchSchema),batchController.updateBatch);
router.delete("/:instituteId/batches/:batchId",validate(batchIdSchema),batchController.deleteBatch);

// Batch members
router.post( "/:instituteId/batches/:batchId/members", validate(addBatchMembersSchema), batchController.addBatchMembers);
router.get( "/:instituteId/batches/:batchId/members",validate(listBatchMembersSchema),batchController.listBatchMembers);
router.delete("/:instituteId/batches/:batchId/members/:userId",validate(removeBatchMemberSchema),batchController.removeBatchMember);

module.exports = router;
