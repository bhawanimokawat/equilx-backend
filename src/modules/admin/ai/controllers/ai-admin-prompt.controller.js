
const service = require("../services/ai-admin-prompt.service");

function handler(fn, successStatus = 200) {
  return async (req, res) => {
    try {
      const data = await fn(req);

      return res.status(successStatus).json({
        success: true,
        data,
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "This prompt version already exists.",
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

const listPrompts = handler(() => service.listPrompts());

const getPromptHistory = handler((req) =>
  service.getPromptHistory(req.params.promptKey)
);

const createPrompt = handler(
  (req) => service.createPrompt(req.body),
  201
);

const updatePromptDraft = handler((req) =>
  service.updatePromptDraft(req.params.promptId, req.body)
);

const publishPrompt = handler((req) =>
  service.activatePrompt(req.params.promptId)
);

const rollbackPrompt = handler((req) =>
  service.activatePrompt(req.params.promptId)
);

module.exports = {
  listPrompts,
  getPromptHistory,
  createPrompt,
  updatePromptDraft,
  publishPrompt,
  rollbackPrompt,
};
