
const { prisma } = require("../../../../config/database");

const ALLOWED_PURPOSES = [
  "WRITING",
  "SPEAKING",
  "TRANSCRIPTION",
];

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function createAIAdminModelService({
  database = prisma,
} = {}) {
  async function listModels() {
    return database.aIModel.findMany({
      orderBy: [{ provider: "asc" }, { modelName: "asc" }],
      include: {
        routes: {
          orderBy: [{ purpose: "asc" }, { priority: "asc" }],
        },
        _count: {
          select: { usageLogs: true },
        },
      },
    });
  }

  async function createModel({ provider, modelName, version }) {
    if (
      typeof provider !== "string" ||
      !provider.trim() ||
      typeof modelName !== "string" ||
      !modelName.trim()
    ) {
      fail("Provider and model name are required.");
    }

    return database.aIModel.create({
      data: {
        provider: provider.trim().toLowerCase(),
        modelName: modelName.trim(),
        version: version?.trim() || null,
      },
      include: { routes: true },
    });
  }

  async function updateModel(modelId, data) {
    const update = {};

    if (typeof data.isActive === "boolean") {
      update.isActive = data.isActive;
    }

    if (data.modelName !== undefined) {
      if (typeof data.modelName !== "string" || !data.modelName.trim()) {
        fail("Model name cannot be empty.");
      }
      update.modelName = data.modelName.trim();
    }

    if (data.version !== undefined) {
      update.version = data.version?.trim() || null;
    }

    if (!Object.keys(update).length) {
      fail("No valid model fields supplied.");
    }

    try {
      return await database.aIModel.update({
        where: { id: modelId },
        data: update,
        include: { routes: true },
      });
    } catch (error) {
      if (error.code === "P2025") fail("AI model not found.", 404);
      throw error;
    }
  }

  async function createRoute({ aiModelId, purpose, priority = 0 }) {
    if (!ALLOWED_PURPOSES.includes(purpose)) {
      fail("Unsupported AI route purpose.");
    }

    if (!Number.isInteger(priority) || priority < 0) {
      fail("Priority must be a non-negative integer.");
    }

    const model = await database.aIModel.findUnique({
      where: { id: aiModelId },
      select: { id: true, isActive: true },
    });

    if (!model) fail("AI model not found.", 404);
    if (!model.isActive) fail("Cannot route to an inactive model.");

    return database.aIModelRoute.create({
      data: { aiModelId, purpose, priority },
      include: { aiModel: true },
    });
  }

  async function updateRoute(routeId, data) {
    const update = {};

    if (typeof data.isEnabled === "boolean") {
      update.isEnabled = data.isEnabled;
    }

    if (data.priority !== undefined) {
      if (!Number.isInteger(data.priority) || data.priority < 0) {
        fail("Priority must be a non-negative integer.");
      }
      update.priority = data.priority;
    }

    if (!Object.keys(update).length) {
      fail("No valid route fields supplied.");
    }

    try {
      return await database.aIModelRoute.update({
        where: { id: routeId },
        data: update,
        include: { aiModel: true },
      });
    } catch (error) {
      if (error.code === "P2025") fail("AI route not found.", 404);
      throw error;
    }
  }

  async function deleteRoute(routeId) {
    const route = await database.aIModelRoute.findUnique({
      where: { id: routeId },
    });

    if (!route) fail("AI route not found.", 404);

    if (route.isEnabled) {
      const enabledCount = await database.aIModelRoute.count({
        where: {
          purpose: route.purpose,
          isEnabled: true,
        },
      });

      if (enabledCount <= 1) {
        fail("Cannot delete the last enabled route for this purpose.");
      }
    }

    return database.aIModelRoute.delete({
      where: { id: routeId },
    });
  }

  return {
    listModels,
    createModel,
    updateModel,
    createRoute,
    updateRoute,
    deleteRoute,
  };
}

const service = createAIAdminModelService();

module.exports = {
  ...service,
  createAIAdminModelService,
};
