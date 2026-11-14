
const aiConfig = require("../config/ai.config");

const geminiProvider = require("./gemini.provider");

// Register future providers here using the same interface.
const providers = {
  gemini: geminiProvider,
};

function getActiveProvider() {
  const provider = providers[aiConfig.provider];

  if (!provider) {
    throw new Error(
      `AI provider "${aiConfig.provider}" is not implemented.`
    );
  }

  return provider;
}

async function generateText(options) {
  return getActiveProvider().generateText(options);
}

async function transcribeAudio(options) {
  const provider = getActiveProvider();

  if (typeof provider.transcribeAudio !== "function") {
    throw new Error(
      `Audio transcription is not supported by AI provider "${aiConfig.provider}".`
    );
  }

  return provider.transcribeAudio(options);
}

async function generateAudioEvaluation(options) {
  const provider = getActiveProvider();

  if (typeof provider.generateAudioEvaluation !== "function") {
    throw new Error(
      `Audio evaluation is not supported by AI provider "${aiConfig.provider}".`
    );
  }

  return provider.generateAudioEvaluation(options);
}
module.exports = {
  generateText,
  transcribeAudio,
  getActiveProvider,
  generateAudioEvaluation,
};
