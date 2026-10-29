const crmService = require("../services/crm.service");
const validation = require("../validation/crm.validation");

function sendValidationError(res, error) {
  return res.status(400).json({
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "The request data is invalid.",
      details: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    },
  });
}

function handleError(next, error) {
  return next(error);
}

async function createLead(req, res, next) {
  const parsed = validation.createLeadSchema.safeParse(req.body);
  if (!parsed.success) return sendValidationError(res, parsed.error);

  try {
    const lead = await crmService.createLead(req.crmScope, parsed.data);
    return res.status(201).json({ success: true, data: lead });
  } catch (error) {
    return handleError(next, error);
  }
}

async function listLeads(req, res, next) {
  const parsed = validation.paginationSchema.safeParse(req.query);
  if (!parsed.success) return sendValidationError(res, parsed.error);

  try {
    const result = await crmService.listLeads(req.crmScope, parsed.data);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return handleError(next, error);
  }
}

async function getLeadById(req, res, next) {
  const parsed = validation.leadIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendValidationError(res, parsed.error);

  try {
    const lead = await crmService.getLeadById(
      req.crmScope,
      parsed.data.leadId
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          code: "LEAD_NOT_FOUND",
          message: "The requested lead was not found.",
        },
      });
    }

    return res.status(200).json({ success: true, data: lead });
  } catch (error) {
    return handleError(next, error);
  }
}

async function updateLead(req, res, next) {
  const params = validation.leadIdParamSchema.safeParse(req.params);
  if (!params.success) return sendValidationError(res, params.error);

  const body = validation.updateLeadSchema.safeParse(req.body);
  if (!body.success) return sendValidationError(res, body.error);

  try {
    const lead = await crmService.updateLead(
      req.crmScope,
      params.data.leadId,
      body.data
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          code: "LEAD_NOT_FOUND",
          message: "The requested lead was not found.",
        },
      });
    }

    return res.status(200).json({ success: true, data: lead });
  } catch (error) {
    return handleError(next, error);
  }
}

async function deleteLead(req, res, next) {
  const parsed = validation.leadIdParamSchema.safeParse(req.params);
  if (!parsed.success) return sendValidationError(res, parsed.error);

  try {
    const deleted = await crmService.softDeleteLead(
      req.crmScope,
      parsed.data.leadId
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: "LEAD_NOT_FOUND",
          message: "The requested lead was not found.",
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Lead deleted successfully.",
    });
  } catch (error) {
    return handleError(next, error);
  }
}



async function updateLeadStatus(req, res, next) {
  const params = validation.leadIdParamSchema.safeParse(req.params);
  if (!params.success) return sendValidationError(res, params.error);

  const body = validation.updateLeadStatusSchema.safeParse(req.body);
  if (!body.success) return sendValidationError(res, body.error);

  try {
    const lead = await crmService.updateLeadStatus(
      req.crmScope,
      params.data.leadId,
      body.data
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          code: "LEAD_NOT_FOUND",
          message: "The requested lead was not found.",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: lead,
    });
  } catch (error) {
    return handleError(next, error);
  }
}

async function getLeadStatusHistory(req, res, next) {
  const params = validation.leadIdParamSchema.safeParse(req.params);
  if (!params.success) return sendValidationError(res, params.error);

  try {
    const history = await crmService.getLeadStatusHistory(
      req.crmScope,
      params.data.leadId
    );

    if (history === null) {
      return res.status(404).json({
        success: false,
        error: {
          code: "LEAD_NOT_FOUND",
          message: "The requested lead was not found.",
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    return handleError(next, error);
  }
}


async function assignLead(req, res, next) {
  const params = validation.leadIdParamSchema.safeParse(req.params);
  if (!params.success) return sendValidationError(res, params.error);

  const body = validation.assignLeadSchema.safeParse(req.body);
  if (!body.success) return sendValidationError(res, body.error);

  try {
    const lead = await crmService.assignLead(
      req.crmScope,
      params.data.leadId,
      body.data
    );

    if (!lead) {
      return res.status(404).json({
        success: false,
        error: {
          code: "LEAD_NOT_FOUND",
          message: "The requested lead was not found.",
        },
      });
    }

    return res.status(200).json({ success: true, data: lead });
  } catch (error) {
    return handleError(next, error);
  }
}

async function getLeadAssignmentHistory(req, res, next) {
  const params = validation.leadIdParamSchema.safeParse(req.params);
  if (!params.success) return sendValidationError(res, params.error);

  try {
    const history = await crmService.getLeadAssignmentHistory(
      req.crmScope,
      params.data.leadId
    );

    if (history === null) {
      return res.status(404).json({
        success: false,
        error: {
          code: "LEAD_NOT_FOUND",
          message: "The requested lead was not found.",
        },
      });
    }

    return res.status(200).json({ success: true, data: history });
  } catch (error) {
    return handleError(next, error);
  }
}

async function listAssignableUsers(req, res, next) {
  try {
    const users = await crmService.listAssignableUsers(req.crmScope);
    return res.status(200).json({ success: true, data: users });
  } catch (error) {
    return handleError(next, error);
  }
}



async function createLeadFollowUpHandler(req, res, next) {
  try {
    const params = leadIdParamSchema.safeParse(req.params);
    const body = createLeadFollowUpSchema.safeParse(req.body);

    if (!params.success || !body.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: {
          params: params.success ? undefined : params.error.flatten(),
          body: body.success ? undefined : body.error.flatten(),
        },
      });
    }

    const followUp = await createLeadFollowUp(
      req.crmScope,
      params.data.leadId,
      body.data
    );

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
        code: "LEAD_NOT_FOUND",
      });
    }

    return res.status(201).json({
      success: true,
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
}

async function listLeadFollowUpsHandler(req, res, next) {
  try {
    const query = listFollowUpsSchema.safeParse(req.query);

    if (!query.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: query.error.flatten(),
      });
    }

    const result = await listLeadFollowUps(
      req.crmScope,
      query.data
    );

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

async function completeLeadFollowUpHandler(req, res, next) {
  return changeLeadFollowUpStatus(req, res, next, "COMPLETED");
}

async function cancelLeadFollowUpHandler(req, res, next) {
  return changeLeadFollowUpStatus(req, res, next, "CANCELLED");
}

async function changeLeadFollowUpStatus(req, res, next, status) {
  try {
    const params = followUpIdParamSchema.safeParse(req.params);

    if (!params.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: params.error.flatten(),
      });
    }

    const followUp = await updateLeadFollowUpStatus(
      req.crmScope,
      params.data.followUpId,
      status
    );

    if (!followUp) {
      return res.status(404).json({
        success: false,
        message: "Follow-up not found.",
        code: "FOLLOW_UP_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      data: followUp,
    });
  } catch (error) {
    next(error);
  }
}



async function createLeadActivityHandler(req, res, next) {
  try {
    const params = leadIdParamSchema.safeParse(req.params);
    const body = createActivitySchema.safeParse(req.body);

    if (!params.success || !body.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: {
          params: params.success ? undefined : params.error.flatten(),
          body: body.success ? undefined : body.error.flatten(),
        },
      });
    }

    const activity = await createLeadActivity(
      req.crmScope,
      params.data.leadId,
      body.data
    );

    if (!activity) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
        code: "LEAD_NOT_FOUND",
      });
    }

    return res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    next(error);
  }
}

async function listLeadActivitiesHandler(req, res, next) {
  try {
    const params = leadIdParamSchema.safeParse(req.params);

    const querySchema = z.object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).strict();

    const query = querySchema.safeParse(req.query);

    if (!params.success || !query.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: {
          params: params.success ? undefined : params.error.flatten(),
          query: query.success ? undefined : query.error.flatten(),
        },
      });
    }

    const result = await listLeadActivities(
      req.crmScope,
      params.data.leadId,
      query.data.page,
      query.data.limit
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Lead not found.",
        code: "LEAD_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}


async function createLeadSourceHandler(req, res, next) {
  try {
    const body = createLeadSourceSchema.safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: body.error.flatten(),
      });
    }

    const source = await createLeadSource(req.crmScope, body.data);

    return res.status(201).json({
      success: true,
      data: source,
    });
  } catch (error) {
    next(error);
  }
}

async function listLeadSourcesHandler(req, res, next) {
  try {
    const query = z.object({
      includeInactive: z.enum(["true", "false"]).default("false"),
    }).strict().safeParse(req.query);

    if (!query.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: query.error.flatten(),
      });
    }

    const sources = await listLeadSources(
      req.crmScope,
      query.data.includeInactive === "true"
    );

    return res.status(200).json({
      success: true,
      data: sources,
    });
  } catch (error) {
    next(error);
  }
}

async function updateLeadSourceHandler(req, res, next) {
  try {
    const params = sourceIdParamSchema.safeParse(req.params);
    const body = updateLeadSourceSchema.safeParse(req.body);

    if (!params.success || !body.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: {
          params: params.success ? undefined : params.error.flatten(),
          body: body.success ? undefined : body.error.flatten(),
        },
      });
    }

    const source = await updateLeadSource(
      req.crmScope,
      params.data.sourceId,
      body.data
    );

    if (!source) {
      return res.status(404).json({
        success: false,
        message: "Lead source not found.",
        code: "LEAD_SOURCE_NOT_FOUND",
      });
    }

    return res.status(200).json({
      success: true,
      data: source,
    });
  } catch (error) {
    next(error);
  }
}



async function exportLeadsCsvHandler(req, res, next) {
  try {
    const csv = await exportLeadsCsv(req.crmScope);

    const filename = `equilx-leads-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.setHeader("Cache-Control", "no-store");

    return res.status(200).send("\uFEFF" + csv);
  } catch (error) {
    next(error);
  }
}



async function importLeadsCsvHandler(req, res, next) {
  try {
    const body = importLeadsCsvSchema.safeParse(req.body);

    if (!body.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: body.error.flatten(),
      });
    }

    const report = await importLeadsCsv(
      req.crmScope,
      body.data.csv
    );

    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}


module.exports = {
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
  importLeadsCsvHandler
};
