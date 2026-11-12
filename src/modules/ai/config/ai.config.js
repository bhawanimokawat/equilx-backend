const env = require("../../../config/env");

const aiConfig = Object.freeze({
    provider: env.AI_PROVIDER,


    gemini: {
        apiKey: env.GEMINI_API_KEY,
        model: env.GEMINI_MODEL,
        transcriptionModel: env.GEMINI_TRANSCRIPTION_MODEL,
        speakingModel: env.GEMINI_SPEAKING_MODEL,
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