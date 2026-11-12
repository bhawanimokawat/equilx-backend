
const aiConfig = require("../config/ai.config");

let clientPromise = null;

async function getClient() {
  if (!aiConfig.gemini.apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  if (!clientPromise) {
    clientPromise = import("@google/genai")
      .then(({ GoogleGenAI }) => {
        return new GoogleGenAI({
          apiKey: aiConfig.gemini.apiKey,
          httpOptions: {
            apiVersion: "v1beta",
          },
        });
      })
      .catch((error) => {
        clientPromise = null;
        throw new Error("Failed to initialize Gemini provider.", {
          cause: error,
        });
      });
  }

  return clientPromise;
}

async function generateText({
  prompt,
  systemInstruction,
  generation = {},
}) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("A valid AI prompt is required.");
  }

  const client = await getClient();

  const config = {
    temperature:
      generation.temperature ?? aiConfig.generation.temperature,
    maxOutputTokens:
      generation.maxOutputTokens ??
      aiConfig.generation.maxOutputTokens,
  };

  if (systemInstruction) {
    config.systemInstruction = systemInstruction;
  }

  const response = await client.models.generateContent({
    model: aiConfig.gemini.model,
    contents: prompt,
    config,
  });

 const text =
  response.text ||
  response.candidates
    ?.flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n");

if (!text || !text.trim()) {
  console.error(
    "[GEMINI EMPTY TEXT RESPONSE]",
    JSON.stringify(response, null, 2)
  );

  throw new Error(
    "Gemini returned no extractable text. Check the response diagnostics."
  );
}

  const usage = response.usageMetadata || {};

  return {
    text: text.trim(),
    model: aiConfig.gemini.model,
    usage: {
      inputTokens: usage.promptTokenCount ?? 0,
      outputTokens: usage.candidatesTokenCount ?? 0,
      totalTokens: usage.totalTokenCount ?? 0,
    },
  };
}




async function transcribeAudio({ filePath, mimeType }) {
  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("A valid audio file path is required.");
  }

  if (typeof mimeType !== "string" || !mimeType.trim()) {
    throw new Error("A valid audio MIME type is required.");
  }

  const client = await getClient();
  let uploadedFile = null;

  try {
    uploadedFile = await client.files.upload({
      file: filePath,
      config: {
        mimeType,
      },
    });

    if (!uploadedFile?.uri || !uploadedFile?.name) {
      throw new Error("Gemini audio upload failed.");
    }

    const interaction = await client.interactions.create({
      model: aiConfig.gemini.transcriptionModel,
      input: [
        {
          type: "audio",
          uri: uploadedFile.uri,
          mime_type: uploadedFile.mimeType || mimeType,
        },
      ],
    });

    const transcript = interaction.output_text;

    if (typeof transcript !== "string" || !transcript.trim()) {
      throw new Error("Gemini returned an empty transcript.");
    }

    return {
      transcript: transcript.trim(),
      model: aiConfig.gemini.transcriptionModel,
      usage: interaction.usage || null,
    };
  } finally {
    if (uploadedFile?.name) {
      try {
        await client.files.delete({
          name: uploadedFile.name,
        });
      } catch (error) {
        console.error(
          "[GEMINI TRANSCRIPTION CLEANUP ERROR]",
          error.message
        );
      }
    }
  }
}



async function generateAudioEvaluation({
  prompt,
  systemInstruction,
  filePath,
  mimeType,
}) {
  if (typeof prompt !== "string" || !prompt.trim()) {
    throw new Error("A valid Speaking evaluation prompt is required.");
  }

  if (typeof filePath !== "string" || !filePath.trim()) {
    throw new Error("A valid audio file path is required.");
  }

  if (typeof mimeType !== "string" || !mimeType.trim()) {
    throw new Error("A valid audio MIME type is required.");
  }

  const client = await getClient();
  let uploadedFile = null;

  const startedAt = Date.now();

  const logStage = (message) => {
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(2);
    console.log(`[GEMINI SPEAKING ${seconds}s] ${message}`);
  };

  try {
    logStage("Starting audio upload...");

    uploadedFile = await client.files.upload({
      file: filePath,
      config: { mimeType },
    });

    if (!uploadedFile?.uri) {
      throw new Error("Gemini audio upload failed.");
    }

    logStage("Audio upload completed.");
    logStage("Starting Speaking evaluation...");

    const result = await client.models.generateContent({
      model: aiConfig.gemini.speakingModel,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemInstruction || ""}\n\n${prompt}`,
            },
            {
              fileData: {
                fileUri: uploadedFile.uri,
                mimeType: uploadedFile.mimeType || mimeType,
              },
            },
          ],
        },
      ],
      config: {
        temperature: aiConfig.generation.temperature,
        maxOutputTokens: aiConfig.generation.maxOutputTokens,
      },
    });

    const responseText = result.text;

    if (typeof responseText !== "string" || !responseText.trim()) {
      throw new Error("Gemini returned an empty Speaking evaluation.");
    }

    logStage("Speaking evaluation completed successfully.");

    return {
      text: responseText.trim(),
      model: aiConfig.gemini.speakingModel,
      usage: result.usageMetadata || null,
    };
  } catch (error) {
    logStage(`Evaluation failed: ${error.message}`);
    throw error;
  } finally {
    if (uploadedFile?.name) {
      try {
        logStage("Starting uploaded audio cleanup...");
        await client.files.delete({ name: uploadedFile.name });
        logStage("Uploaded audio cleanup completed.");
      } catch (error) {
        console.error("[GEMINI AUDIO CLEANUP ERROR]", error.message);
      }
    }
  }
}



module.exports = {
  generateText,
  transcribeAudio,
  generateAudioEvaluation,
};
