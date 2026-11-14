
require("dotenv").config();

async function checkModels() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing from .env");
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models",
    {
      headers: {
        "x-goog-api-key": apiKey,
      },
    }
  );

  const result = await response.json();

  console.log("HTTP Status:", response.status);

  if (!response.ok) {
    console.log("API Error:", result.error?.message);
    return;
  }

  const models = (result.models || []).filter((model) =>
    /transcrib|audio/i.test(model.name)
  );

  console.log(
    "Available audio/transcription models:",
    JSON.stringify(
      models.map((model) => ({
        name: model.name,
        supportedGenerationMethods:
          model.supportedGenerationMethods,
      })),
      null,
      2
    )
  );
}

checkModels().catch((error) => {
  console.error("Diagnostic failed:", error.message);
});
