
require("dotenv").config();

const { test } = require("node:test");
const assert = require("node:assert/strict");

const aiConfig = require("../../src/modules/ai/config/ai.config");
const {
  generateText,
  transcribeAudio,
  generateAudioEvaluation,
} = require("../../src/modules/ai/providers/gemini.provider");

test("Writing accepts its configured default model", async () => {
  await assert.rejects(
    generateText({
      prompt: "Test prompt",
      model: aiConfig.gemini.speakingModel,
    }),
    /not configured for WRITING/
  );
});

test("Speaking rejects a Writing-only model", async () => {
  await assert.rejects(
    generateAudioEvaluation({
      prompt: "Test prompt",
      filePath: "dummy.mp3",
      mimeType: "audio/mpeg",
      model: aiConfig.gemini.model,
    }),
    /not configured for SPEAKING/
  );
});

test("Transcription rejects a Writing-only model", async () => {
  await assert.rejects(
    transcribeAudio({
      filePath: "dummy.mp3",
      mimeType: "audio/mpeg",
      model: aiConfig.gemini.model,
    }),
    /not configured for TRANSCRIPTION/
  );
});

test("Unknown models are rejected", async () => {
  await assert.rejects(
    generateText({
      prompt: "Test prompt",
      model: "unconfigured-test-model",
    }),
    /is not configured/
  );
});
