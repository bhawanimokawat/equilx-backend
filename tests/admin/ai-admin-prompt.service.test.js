
const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  createAIAdminPromptService,
} = require("../../src/modules/admin/ai/services/ai-admin-prompt.service");

function createPrompt({
  id = "prompt-1",
  promptKey = "WRITING_EVALUATION",
  version = 1,
  isActive = false,
  systemInstruction = "You are an IELTS evaluator.",
  promptTemplate = "Evaluate {{responseText}}",
} = {}) {
  return {
    id,
    promptKey,
    version,
    isActive,
    description: "Test prompt",
    createdAt: new Date(),
    promptText: JSON.stringify({
      format: "EQUILX_PROMPT_V1",
      systemInstruction,
      promptTemplate,
    }),
  };
}

function createTestService(initialRecords = []) {
  const records = [...initialRecords];
  const calls = [];

  const database = {
    aIPromptVersion: {
      async findMany(query) {
        calls.push({ method: "findMany", query });

        if (query.where?.promptKey) {
          return records
            .filter((item) => item.promptKey === query.where.promptKey)
            .sort((a, b) => b.version - a.version);
        }

        return [...records].sort(
          (a, b) =>
            a.promptKey.localeCompare(b.promptKey) ||
            b.version - a.version
        );
      },

      async findFirst(query) {
        calls.push({ method: "findFirst", query });

        const matching = records
          .filter((item) => item.promptKey === query.where.promptKey)
          .sort((a, b) => b.version - a.version);

        const record = matching[0];

        if (!record) return null;

        if (query.select?.id) return { id: record.id };
        if (query.select?.version) return { version: record.version };

        return record;
      },

      async findUnique(query) {
        calls.push({ method: "findUnique", query });

        return records.find(
          (item) => item.id === query.where.id
        ) || null;
      },

      async create(query) {
        calls.push({ method: "create", query });

        const record = {
          id: `prompt-${records.length + 1}`,
          ...query.data,
          createdAt: new Date(),
        };

        records.push(record);
        return record;
      },

      async update(query) {
        calls.push({ method: "update", query });

        const record = records.find(
          (item) => item.id === query.where.id
        );

        if (!record) {
          const error = new Error("Record not found");
          error.code = "P2025";
          throw error;
        }

        Object.assign(record, query.data);
        return record;
      },

      async updateMany(query) {
        calls.push({ method: "updateMany", query });

        let count = 0;

        for (const record of records) {
          if (record.promptKey === query.where.promptKey) {
            Object.assign(record, query.data);
            count += 1;
          }
        }

        return { count };
      },
    },
  };

  database.$transaction = async (callback) => callback(database);

  return {
    service: createAIAdminPromptService({ database }),
    records,
    calls,
  };
}

test("Prompt listing groups versions by prompt key", async () => {
  const { service } = createTestService([
    createPrompt({ id: "p1", version: 2, isActive: true }),
    createPrompt({ id: "p2", version: 1 }),
    createPrompt({
      id: "p3",
      promptKey: "SPEAKING_EVALUATION",
      version: 1,
    }),
  ]);

  const result = await service.listPrompts();

  assert.equal(result.length, 2);

  const writing = result.find(
    (item) => item.promptKey === "WRITING_EVALUATION"
  );

  assert.equal(writing.latestVersion, 2);
  assert.equal(writing.activeVersion.id, "p1");
  assert.equal(writing.versions.length, 2);
});

test("Prompt history returns versions in descending order", async () => {
  const { service } = createTestService([
    createPrompt({ id: "p1", version: 1 }),
    createPrompt({ id: "p2", version: 3 }),
    createPrompt({ id: "p3", version: 2 }),
  ]);

  const result = await service.getPromptHistory("WRITING_EVALUATION");

  assert.deepEqual(
    result.map((item) => item.version),
    [3, 2, 1]
  );
});

test("Prompt history returns 404 when prompt does not exist", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.getPromptHistory("WRITING_EVALUATION"),
    { statusCode: 404 }
  );
});

test("Invalid prompt key is rejected", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.getPromptHistory("writing-evaluation"),
    { statusCode: 400 }
  );
});

test("Creating a prompt creates the next draft version", async () => {
  const { service, records } = createTestService([
    createPrompt({ version: 2 }),
  ]);

  const result = await service.createPrompt({
    promptKey: "WRITING_EVALUATION",
    systemInstruction: "New system instruction",
    promptTemplate: "New template {{responseText}}",
    description: "New draft",
  });

  assert.equal(result.version, 3);
  assert.equal(result.isActive, false);
  assert.equal(result.systemInstruction, "New system instruction");
  assert.equal(result.promptTemplate, "New template {{responseText}}");
  assert.equal(records.length, 2);
});

test("Creating the first prompt starts at version one", async () => {
  const { service } = createTestService();

  const result = await service.createPrompt({
    promptKey: "SPEAKING_EVALUATION",
    systemInstruction: "Speaking evaluator",
    promptTemplate: "Evaluate {{transcript}}",
  });

  assert.equal(result.version, 1);
  assert.equal(result.isActive, false);
});

test("Creating a prompt rejects invalid content", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.createPrompt({
      promptKey: "WRITING_EVALUATION",
      systemInstruction: "",
      promptTemplate: "Evaluate response",
    }),
    { statusCode: 400 }
  );
});

test("Draft update changes prompt content", async () => {
  const draft = createPrompt({ id: "draft-1" });
  const { service } = createTestService([draft]);

  const result = await service.updatePromptDraft("draft-1", {
    systemInstruction: "Updated instruction",
    promptTemplate: "Updated {{responseText}}",
    description: "Updated description",
  });

  assert.equal(result.systemInstruction, "Updated instruction");
  assert.equal(result.promptTemplate, "Updated {{responseText}}");
  assert.equal(result.description, "Updated description");
});

test("Published prompts cannot be edited", async () => {
  const active = createPrompt({
    id: "active-1",
    isActive: true,
  });

  const { service } = createTestService([active]);

  await assert.rejects(
    service.updatePromptDraft("active-1", {
      promptTemplate: "Changed template",
    }),
    { statusCode: 400 }
  );
});

test("Only the latest draft version can be edited", async () => {
  const { service } = createTestService([
    createPrompt({ id: "old-draft", version: 1 }),
    createPrompt({ id: "latest-draft", version: 2 }),
  ]);

  await assert.rejects(
    service.updatePromptDraft("old-draft", {
      promptTemplate: "Changed template",
    }),
    { statusCode: 400 }
  );
});

test("Publishing activates the selected prompt version", async () => {
  const { service, records } = createTestService([
    createPrompt({ id: "old-version", version: 1, isActive: true }),
    createPrompt({ id: "new-version", version: 2 }),
  ]);

  const result = await service.activatePrompt("new-version");

  assert.equal(result.id, "new-version");
  assert.equal(result.isActive, true);

  assert.equal(
    records.find((item) => item.id === "old-version").isActive,
    false
  );
});

test("Rollback reactivates an older prompt version", async () => {
  const { service, records } = createTestService([
    createPrompt({ id: "version-1", version: 1 }),
    createPrompt({ id: "version-2", version: 2, isActive: true }),
  ]);

  const result = await service.activatePrompt("version-1");

  assert.equal(result.id, "version-1");
  assert.equal(result.isActive, true);

  assert.equal(
    records.find((item) => item.id === "version-2").isActive,
    false
  );
});

test("Publishing a missing prompt returns 404", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.activatePrompt("missing-prompt"),
    { statusCode: 404 }
  );
});
