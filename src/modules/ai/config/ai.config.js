
const env = require("../../../config/env");

const configuredModels = [
    {
        modelName: env.GEMINI_MODEL,
        purposes: ["WRITING"],
    },
    {
        modelName: env.GEMINI_SPEAKING_MODEL,
        purposes: ["SPEAKING"],
    },
    {
        modelName: env.GEMINI_TRANSCRIPTION_MODEL,
        purposes: ["TRANSCRIPTION"],
    },
];

// Merge duplicate model IDs while preserving all supported purposes.
const modelMap = new Map();

for (const model of configuredModels) {
    const existing = modelMap.get(model.modelName);

    if (existing) {
        existing.purposes.push(...model.purposes);
    } else {
        modelMap.set(model.modelName, {
            modelName: model.modelName,
            purposes: [...model.purposes],
        });
    }
}

const modelCatalog = Object.freeze(
    [...modelMap.values()].map((model) =>
        Object.freeze({
            modelName: model.modelName,
            purposes: Object.freeze([...new Set(model.purposes)]),
        })
    )
);

const aiConfig = Object.freeze({
    provider: env.AI_PROVIDER,

    gemini: {
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL,
        transcriptionModel: env.GEMINI_TRANSCRIPTION_MODEL,
        speakingModel: env.GEMINI_SPEAKING_MODEL,

        // Server-side allowlist of configured Gemini models.
        modelCatalog,
    },

    generation: {
        temperature: 0.2,
        maxOutputTokens: 4096,
    },

    queue: {
        name: "equilx-ai",
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000,
        },
    },
});

module.exports = aiConfig;
