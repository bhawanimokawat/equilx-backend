
const service = require("../services/ai-admin-settings.service");

function handler(fn) {
  return async (req, res) => {
    try {
      const data = await fn(req);

      return res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "AI settings conflict.",
        });
      }

      if (error.code === "P2023" || error.code === "P2003") {
        return res.status(400).json({
          success: false,
          message: "Invalid settings data.",
        });
      }

      return res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode
          ? error.message
          : "Internal server error.",
      });
    }
  };
}

const getConfig = handler(() => service.getConfig());

const updateConfig = handler((req) =>
  service.updateConfig(req.body)
);

const getLimits = handler(() => service.getLimits());

const updateLimits = handler((req) =>
  service.updateLimits(req.body)
);

module.exports = {
  getConfig,
  updateConfig,
  getLimits,
  updateLimits,
};
