
require("dotenv").config();

const { test } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const aiConfig = require("../../src/modules/ai/config/ai.config");

const {
  generateText,
  transcribeAudio,
  generateAudioEvaluation,
} = require("../../src/modules/ai/providers/gemini.provider");

const fixturePath = path.join(
  __dirname,
  "fixtures",
  "arth_mb.mp3"
);

const mimeType = "audio/mpeg";

const integrationEnabled =
  process.env.GEMINI_INTEGRATION_TESTS === "true";

const timeout = 180000;

// --------------------------------------------------
// 1. Configuration test
// --------------------------------------------------

test("Gemini configuration is valid", () => {
  assert.equal(aiConfig.provider, "gemini");

  assert.ok(aiConfig.gemini.apiKey, "Gemini API key is missing.");

  assert.ok(aiConfig.gemini.model, "Text model is missing.");

  assert.ok(
    aiConfig.gemini.transcriptionModel,
    "Transcription model is missing."
  );

  assert.ok(
    aiConfig.gemini.speakingModel,
    "Speaking model is missing."
  );

  assert.ok(
    fs.existsSync(fixturePath),
    "Speaking audio fixture was not found."
  );
});

// --------------------------------------------------
// 2. Gemini text generation integration test
// --------------------------------------------------

test(
  "Gemini generates text successfully",
  {
    skip: !integrationEnabled,
    timeout,
  },
  async () => {
    const result = await generateText({
      prompt: "Reply with exactly this text: GEMINI_OK",
      generation: {
        temperature: 0,
        maxOutputTokens: 50,
      },
    });

    assert.ok(
      typeof result.text === "string" && result.text.length > 0,
      "Gemini returned an empty text response."
    );

    assert.ok(result.model, "Model name is missing.");

    console.log("[TEST] Text generation:", result.text);
    console.log("[TEST] Text model:", result.model);
  }
);

// --------------------------------------------------
// 3. Gemini audio transcription integration test
// --------------------------------------------------

test(
  "Gemini transcribes Speaking audio successfully",
  {
    skip: !integrationEnabled,
    timeout,
  },
  async () => {
    const result = await transcribeAudio({
      filePath: fixturePath,
      mimeType,
    });

    assert.ok(
      typeof result.transcript === "string" &&
        result.transcript.trim().length > 0,
      "Gemini returned an empty transcript."
    );

    assert.equal(
      result.model,
      aiConfig.gemini.transcriptionModel,
      "Incorrect transcription model returned."
    );

    console.log(
      "[TEST] Transcription model:",
      result.model
    );

    console.log(
      "[TEST] Transcript:",
      result.transcript
    );
  }
);

// --------------------------------------------------
// 4. Gemini Speaking audio evaluation integration test
// --------------------------------------------------

test(
  "Gemini evaluates Speaking audio successfully",
  {
    skip: !integrationEnabled,
    timeout,
  },
  async () => {
    const result = await generateAudioEvaluation({
      filePath: fixturePath,
      mimeType,

      systemInstruction: `
You are an IELTS Speaking assessment assistant.
Evaluate the supplied audio carefully.
Do not claim that your assessment is an official IELTS result.
      `.trim(),

      prompt: `
Listen to the supplied audio and provide a concise assessment.

Return:
1. Short speech summary.
2. Fluency and Coherence observations.
3. Lexical Resource observations.
4. Grammatical Range and Accuracy observations.
5. Pronunciation observations based on the actual audio.

Do not invent information that cannot be heard.
      `.trim(),
    });

    assert.ok(
      typeof result.text === "string" && result.text.trim().length > 0,
      "Gemini returned an empty Speaking evaluation."
    );

    assert.equal(
      result.model,
      aiConfig.gemini.speakingModel,
      "Incorrect Speaking model returned."
    );

    console.log(
      "[TEST] Speaking model:",
      result.model
    );

    console.log(
      "[TEST] Speaking evaluation:",
      result.text
    );
  }
);
