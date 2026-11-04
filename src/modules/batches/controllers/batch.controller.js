
const batchService = require("../services/batch.service");

// 1. Create batch
async function createBatch(req, res, next) {
  try {
    const { params, body } = req.validated;

    const result = await batchService.createBatch({
      userId: req.user.id,
      instituteId: params.instituteId,
      ...body,
    });

    return res.status(201).json({
      success: true,
      message: "Batch created successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 2. List batches
async function listBatches(req, res, next) {
  try {
    const { params, query } = req.validated;

    const result = await batchService.listBatches({
      userId: req.user.id,
      instituteId: params.instituteId,
      page: query.page,
      limit: query.limit,
      search: query.search,
      trainerId: query.trainerId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 3. Get batch details
async function getBatchById(req, res, next) {
  try {
    const { params } = req.validated;

    const result = await batchService.getBatchById({
      userId: req.user.id,
      instituteId: params.instituteId,
      batchId: params.batchId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 4. Update batch
async function updateBatch(req, res, next) {
  try {
    const { params, body } = req.validated;

    const result = await batchService.updateBatch({
      userId: req.user.id,
      instituteId: params.instituteId,
      batchId: params.batchId,
      ...body,
    });

    return res.status(200).json({
      success: true,
      message: "Batch updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 5. Delete batch
async function deleteBatch(req, res, next) {
  try {
    const { params } = req.validated;

    const result = await batchService.deleteBatch({
      userId: req.user.id,
      instituteId: params.instituteId,
      batchId: params.batchId,
    });

    return res.status(200).json({
      success: true,
      message: "Batch deleted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 6. Add students to batch
async function addBatchMembers(req, res, next) {
  try {
    const { params, body } = req.validated;

    const result = await batchService.addBatchMembers({
      userId: req.user.id,
      instituteId: params.instituteId,
      batchId: params.batchId,
      userIds: body.userIds,
    });

    return res.status(200).json({
      success: true,
      message: "Batch members processed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 7. List batch members
async function listBatchMembers(req, res, next) {
  try {
    const { params, query } = req.validated;

    const result = await batchService.listBatchMembers({
      userId: req.user.id,
      instituteId: params.instituteId,
      batchId: params.batchId,
      page: query.page,
      limit: query.limit,
      search: query.search,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 8. Remove student from batch
async function removeBatchMember(req, res, next) {
  try {
    const { params } = req.validated;

    const result = await batchService.removeBatchMember({
      userId: req.user.id,
      instituteId: params.instituteId,
      batchId: params.batchId,
      studentId: params.userId,
    });

    return res.status(200).json({
      success: true,
      message: "Student removed from batch successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

// 9. Student's own batches
async function listMyBatches(req, res, next) {
  try {
    const { params, query } = req.validated;

    const result = await batchService.listMyBatches({
      userId: req.user.id,
      instituteId: params.instituteId,
      page: query.page,
      limit: query.limit,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBatch,
  listBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  addBatchMembers,
  listBatchMembers,
  removeBatchMember,
  listMyBatches,
};
