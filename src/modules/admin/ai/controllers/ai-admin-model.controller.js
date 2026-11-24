
const service = require("../services/ai-admin-model.service");

function sendError(res, error) {
  if (error.code === "P2002") {
    return res.status(409).json({
      success: false,
      message: "A record with these values already exists.",
    });
  }

  if (error.code === "P2023" || error.code === "P2003") {
    return res.status(400).json({
      success: false,
      message: "Invalid identifier or related record.",
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message:
      error.statusCode ? error.message : "Internal server error.",
  });
}

function handler(fn) {
  return async (req, res) => {
    try {
      const data = await fn(req);
      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      return sendError(res, error);
    }
  };
}

const listModels = handler(() => service.listModels());

const createModel = handler((req) =>
  service.createModel(req.body)
);

const updateModel = handler((req) =>
  service.updateModel(req.params.modelId, req.body)
);

const createRoute = handler((req) =>
  service.createRoute(req.body)
);

const updateRoute = handler((req) =>
  service.updateRoute(req.params.routeId, req.body)
);

const deleteRoute = handler((req) =>
  service.deleteRoute(req.params.routeId)
);

module.exports = {
  listModels,
  createModel,
  updateModel,
  createRoute,
  updateRoute,
  deleteRoute,
};
