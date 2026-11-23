
const { prisma } = require("../../../config/database");
const aiConfig = require("../config/ai.config");
const aiProvider = require("../providers/ai.provider");

const PROVIDER = "gemini";

const RETRYABLE_STATUS_CODES = new Set([
  408,
  429,
  500,
  502,
  503,
  504,
]);

const RETRYABLE_NETWORK_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "ECONNREFUSED",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_SOCKET",
]);

function getErrorDetails(error) {
  let current = error;
  const visited = new Set();

  let status = null;
  let code = null;

  while (current && !visited.has(current)) {
    visited.add(current);

    status =
      status ||
      Number(current.status) ||
      Number(current.statusCode) ||
      Number(current.response?.status) ||
      null;

    code = code || current.code || null;

    if (status && code) break;

    current = current.cause;
  }

  return { status, code };
}

function isRetryableError(error) {
  const { status, code } = getErrorDetails(error);

  if (status) {
    return RETRYABLE_STATUS_CODES.has(status);
  }

  return Boolean(code && RETRYABLE_NETWORK_CODES.has(code));
}

function createAIFallbackService({
  database,
  provider,
  config,
}) {
  if (!database?.aIModelRoute?.findMany) {
    throw new Error("A valid AI model route database dependency is required.");
  }

  if (!provider || !config) {
    throw new Error("AI provider and configuration dependencies are required.");
  }

  async function getModelRoutes(purpose) {
    const routes = await database.aIModelRoute.findMany({
      where: {
        purpose,
        isEnabled: true,
        aiModel: {
          isActive: true,
          provider: PROVIDER,
        },
      },
      select: {
        id: true,
        priority: true,
        aiModel: {
          select: {
            id: true,
            provider: true,
            modelName: true,
            isActive: true,
          },
        },
      },
      orderBy: [
        { priority: "asc" },
        { id: "asc" },
      ],
    });

    const allowedModels = config.gemini.modelCatalog;

    const validRoutes = routes.filter((route) => {
      const model = route.aiModel;

      return (
        model &&
        model.provider === PROVIDER &&
        model.isActive &&
        allowedModels.some(
          (configured) =>
            configured.modelName === model.modelName &&
            configured.purposes.includes(purpose)
        )
      );
    });

    if (validRoutes.length === 0) {
      const error = new Error(
        `No enabled and configured AI model routes found for ${purpose}.`
      );

      error.code = "AI_MODEL_ROUTE_NOT_FOUND";
      throw error;
    }

    return validRoutes;
  }

  async function executeWithFallback({
    purpose,
    method,
    options,
  }) {
    if (config.provider !== PROVIDER) {
      throw new Error(
        `Fallback routing currently supports only ${PROVIDER}.`
      );
    }

    const routes = await getModelRoutes(purpose);
    const providerMethod = provider[method];

    if (typeof providerMethod !== "function") {
      throw new Error(
        `AI provider method "${method}" is not available.`
      );
    }

    const attemptedModels = [];
    let lastError = null;

    for (let index = 0; index < routes.length; index += 1) {
      const modelName = routes[index].aiModel.modelName;
      attemptedModels.push(modelName);

      try {
        console.log(
          `[AI FALLBACK] Trying ${modelName} for ${purpose}.`
        );

        const result = await providerMethod({
          ...options,
          model: modelName,
        });

        console.log(
          `[AI FALLBACK] Successfully completed ${purpose} using ${modelName}.`
        );

        return {
          ...result,
          model: modelName,
          fallback: index > 0,
          attemptedModels,
        };
      } catch (error) {
        lastError = error;

        const retryable = isRetryableError(error);
        const hasNextModel = index < routes.length - 1;

        console.error(
          `[AI FALLBACK] ${modelName} failed:`,
          error.message
        );

        if (!retryable || !hasNextModel) {
          break;
        }

        console.warn(
          `[AI FALLBACK] Retrying ${purpose} with the next configured model.`
        );
      }
    }

    const fallbackError = new Error(
      `AI ${purpose.toLowerCase()} failed after attempting ${attemptedModels.length} model(s).`
    );

    fallbackError.code = "AI_ALL_MODELS_FAILED";
    fallbackError.attemptedModels = attemptedModels;
    fallbackError.retryable = isRetryableError(lastError);
    fallbackError.cause = lastError;

    throw fallbackError;
  }

  return {
    getModelRoutes,

    generateTextWithFallback(options) {
      return executeWithFallback({
        purpose: "WRITING",
        method: "generateText",
        options,
      });
    },

    transcribeAudioWithFallback(options) {
      return executeWithFallback({
        purpose: "TRANSCRIPTION",
        method: "transcribeAudio",
        options,
      });
    },

    generateAudioEvaluationWithFallback(options) {
      return executeWithFallback({
        purpose: "SPEAKING",
        method: "generateAudioEvaluation",
        options,
      });
    },
  };
}

const aiFallbackService = createAIFallbackService({
  database: prisma,
  provider: aiProvider,
  config: aiConfig,
});

module.exports = {
  ...aiFallbackService,
  createAIFallbackService,
  isRetryableError,
};
