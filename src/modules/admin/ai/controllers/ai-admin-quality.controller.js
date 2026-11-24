const service = require("../services/ai-admin-quality.service");

function sendError(res, error) {
  return res
    .status(error.statusCode || 500)
    .json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Internal server error.",
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

const getSummary = handler((req) =>
  service.getSummary(req.query)
);

const getBreakdown = handler((req) =>
  service.getBreakdown(req.query)
);

const getTrends = handler((req) =>
  service.getTrends(req.query)
);

module.exports = {
  getSummary,
  getBreakdown,
  getTrends,
};