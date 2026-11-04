const assignmentService = require("../services/assignment.service");

function getPagination(query) {
  return {
    page: Number(query.page || 1),
    limit: Number(query.limit || 20),
  };
}

async function createAssignment(req, res, next) {
  try {
    const assignment = await assignmentService.createAssignment({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      ...req.body,
    });

    return res.status(201).json({
      success: true,
      message: "Assignment created successfully.",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
}

async function listAssignments(req, res, next) {
  try {
    const result = await assignmentService.listAssignments({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      ...getPagination(req.query),
      status: req.query.status,
      search: req.query.search,
    });

    return res.status(200).json({
      success: true,
      message: "Assignments retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getAssignmentById(req, res, next) {
  try {
    const assignment = await assignmentService.getAssignmentById({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      assignmentId: req.params.assignmentId,
    });

    return res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
}

async function updateAssignment(req, res, next) {
  try {
    const assignment = await assignmentService.updateAssignment({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      assignmentId: req.params.assignmentId,
      ...req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Assignment updated successfully.",
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
}

async function publishAssignment(req, res, next) {
  try {
    const result = await assignmentService.publishAssignment({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      assignmentId: req.params.assignmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Assignment published successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function closeAssignment(req, res, next) {
  try {
    const result = await assignmentService.closeAssignment({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      assignmentId: req.params.assignmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Assignment closed successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function cancelAssignment(req, res, next) {
  try {
    const result = await assignmentService.cancelAssignment({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      assignmentId: req.params.assignmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Assignment cancelled successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function listAssignmentTargets(req, res, next) {
  try {
    const result = await assignmentService.listAssignmentTargets({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      assignmentId: req.params.assignmentId,
      ...getPagination(req.query),
      status: req.query.status,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function listMyAssignments(req, res, next) {
  try {
    const result = await assignmentService.listMyAssignments({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      ...getPagination(req.query),
      status: req.query.status,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function getMyAssignmentById(req, res, next) {
  try {
    const result = await assignmentService.getMyAssignmentById({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      assignmentId: req.params.assignmentId,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function startAssignmentAttempt(req, res, next) {
  try {
    const result = await assignmentService.startAssignmentAttempt({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      assignmentId: req.params.assignmentId,
      contentId: req.params.contentId,
    });

    return res.status(201).json({
      success: true,
      message: "Assignment attempt started successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function submitAssignmentAttempt(req, res, next) {
  try {
    const result = await assignmentService.submitAssignmentAttempt({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      assignmentId: req.params.assignmentId,
      completionId: req.params.completionId,
    });

    return res.status(200).json({
      success: true,
      message: "Assignment submitted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

async function deleteAssignment(req, res, next) {
  try {
    const result = await assignmentService.deleteAssignment({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      assignmentId: req.params.assignmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Assignment deleted successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}


async function getAssignmentProgress(req, res, next) {
  try {
    const result = await assignmentService.getAssignmentProgress({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      assignmentId: req.params.assignmentId,
    });

    return res.status(200).json({
      success: true,
      message: "Assignment progress retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}


async function getAssignmentSubmissions(req, res, next) {
  try {
    const result = await assignmentService.getAssignmentSubmissions({
      userId: req.user.id,
      instituteId: req.params.instituteId,
      assignmentId: req.params.assignmentId,
      page: Number(req.query.page || 1),
      limit: Number(req.query.limit || 20),
    });

    return res.status(200).json({
      success: true,
      message: "Assignment submissions retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
}


module.exports = {
  createAssignment,
  listAssignments,
  getAssignmentById,
  updateAssignment,
  publishAssignment,
  closeAssignment,
  cancelAssignment,
  listAssignmentTargets,
  listMyAssignments,
  getMyAssignmentById,
  startAssignmentAttempt,
  submitAssignmentAttempt,
  deleteAssignment,
  getAssignmentProgress,
  getAssignmentSubmissions,
};
