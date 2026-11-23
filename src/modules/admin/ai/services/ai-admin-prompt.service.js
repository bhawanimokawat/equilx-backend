
const { prisma } = require("../../../../config/database");

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function validatePromptKey(promptKey) {
  if (
    typeof promptKey !== "string" ||
    !/^[A-Z][A-Z0-9_]{1,79}$/.test(promptKey)
  ) {
    fail("Prompt key must use uppercase letters, numbers and underscores.");
  }
}

function validatePromptContent(systemInstruction, promptTemplate) {
  if (
    typeof systemInstruction !== "string" ||
    !systemInstruction.trim() ||
    systemInstruction.length > 30000
  ) {
    fail("A valid system instruction is required (maximum 30000 characters).");
  }

  if (
    typeof promptTemplate !== "string" ||
    !promptTemplate.trim() ||
    promptTemplate.length > 50000
  ) {
    fail("A valid prompt template is required (maximum 50000 characters).");
  }
}

function serializePrompt(systemInstruction, promptTemplate) {
  return JSON.stringify({
    format: "EQUILX_PROMPT_V1",
    systemInstruction,
    promptTemplate,
  });
}

function presentPrompt(record) {
  let content;

  try {
    content = JSON.parse(record.promptText);
  } catch {
    content = null;
  }

  return {
    id: record.id,
    promptKey: record.promptKey,
    version: record.version,
    description: record.description,
    isActive: record.isActive,
    createdAt: record.createdAt,
    systemInstruction:
      content?.format === "EQUILX_PROMPT_V1"
        ? content.systemInstruction
        : null,
    promptTemplate:
      content?.format === "EQUILX_PROMPT_V1"
        ? content.promptTemplate
        : record.promptText,
    legacyFormat: content?.format !== "EQUILX_PROMPT_V1",
  };
}

function createAIAdminPromptService({
  database = prisma,
} = {}) {
  async function listPrompts() {
    const records = await database.aIPromptVersion.findMany({
      orderBy: [
        { promptKey: "asc" },
        { version: "desc" },
      ],
    });

    const grouped = new Map();

    for (const record of records) {
      if (!grouped.has(record.promptKey)) {
        grouped.set(record.promptKey, {
          promptKey: record.promptKey,
          activeVersion: null,
          latestVersion: record.version,
          versions: [],
        });
      }

      const group = grouped.get(record.promptKey);
      const prompt = presentPrompt(record);

      group.versions.push(prompt);

      if (record.isActive) {
        group.activeVersion = prompt;
      }
    }

    return [...grouped.values()];
  }

  async function getPromptHistory(promptKey) {
    validatePromptKey(promptKey);

    const records = await database.aIPromptVersion.findMany({
      where: { promptKey },
      orderBy: { version: "desc" },
    });

    if (!records.length) fail("Prompt not found.", 404);

    return records.map(presentPrompt);
  }

  async function createPrompt({
    promptKey,
    systemInstruction,
    promptTemplate,
    description,
  }) {
    validatePromptKey(promptKey);
    validatePromptContent(systemInstruction, promptTemplate);

    if (
      description !== undefined &&
      (typeof description !== "string" || description.length > 500)
    ) {
      fail("Description must be a string of at most 500 characters.");
    }

    return database.$transaction(async (tx) => {
      const latest = await tx.aIPromptVersion.findFirst({
        where: { promptKey },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const record = await tx.aIPromptVersion.create({
        data: {
          promptKey,
          version: (latest?.version || 0) + 1,
          promptText: serializePrompt(systemInstruction, promptTemplate),
          description: description?.trim() || null,
          isActive: false,
        },
      });

      return presentPrompt(record);
    });
  }

  async function updatePromptDraft(promptId, data) {
    const existing = await database.aIPromptVersion.findUnique({
      where: { id: promptId },
    });

    if (!existing) fail("Prompt version not found.", 404);
    if (existing.isActive) fail("Published prompts cannot be edited.");

    const latest = await database.aIPromptVersion.findFirst({
      where: { promptKey: existing.promptKey },
      orderBy: { version: "desc" },
      select: { id: true },
    });

    if (latest?.id !== existing.id) {
      fail("Only the latest draft version can be edited.");
    }

    const current = presentPrompt(existing);

    const systemInstruction =
      data.systemInstruction ?? current.systemInstruction;

    const promptTemplate =
      data.promptTemplate ?? current.promptTemplate;

    validatePromptContent(systemInstruction, promptTemplate);

    if (
      data.description !== undefined &&
      (typeof data.description !== "string" || data.description.length > 500)
    ) {
      fail("Description must be a string of at most 500 characters.");
    }

    const updated = await database.aIPromptVersion.update({
      where: { id: promptId },
      data: {
        promptText: serializePrompt(systemInstruction, promptTemplate),
        ...(data.description !== undefined
          ? { description: data.description.trim() || null }
          : {}),
      },
    });

    return presentPrompt(updated);
  }

  async function activatePrompt(promptId) {
    return database.$transaction(async (tx) => {
      const target = await tx.aIPromptVersion.findUnique({
        where: { id: promptId },
      });

      if (!target) fail("Prompt version not found.", 404);

      await tx.aIPromptVersion.updateMany({
        where: { promptKey: target.promptKey },
        data: { isActive: false },
      });

      const activated = await tx.aIPromptVersion.update({
        where: { id: promptId },
        data: { isActive: true },
      });

      return presentPrompt(activated);
    });
  }

  return {
    listPrompts,
    getPromptHistory,
    createPrompt,
    updatePromptDraft,
    activatePrompt,
  };
}

const service = createAIAdminPromptService();

module.exports = {
  ...service,
  createAIAdminPromptService,
};
