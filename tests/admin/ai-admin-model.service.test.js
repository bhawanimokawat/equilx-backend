
const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  createAIAdminModelService,
} = require("../../src/modules/admin/ai/services/ai-admin-model.service");

function createTestService() {
  const calls = [];

  const database = {
    aIModel: {
      async findMany(query) {
        calls.push({ method: "findMany", query });
        return [{ id: "model-1", provider: "gemini" }];
      },

      async create(query) {
        calls.push({ method: "createModel", query });
        return { id: "model-1", ...query.data };
      },

      async update(query) {
        calls.push({ method: "updateModel", query });
        return { id: query.where.id, ...query.data };
      },

      async findUnique(query) {
        calls.push({ method: "findModel", query });
        return { id: "model-1", isActive: true };
      },
    },

    aIModelRoute: {
      async create(query) {
        calls.push({ method: "createRoute", query });
        return { id: "route-1", ...query.data };
      },

      async update(query) {
        calls.push({ method: "updateRoute", query });
        return { id: query.where.id, ...query.data };
      },

      async findUnique(query) {
        calls.push({ method: "findRoute", query });
        return {
          id: query.where.id,
          purpose: "WRITING",
          isEnabled: true,
        };
      },

      async count(query) {
        calls.push({ method: "countRoutes", query });
        return 2;
      },

      async delete(query) {
        calls.push({ method: "deleteRoute", query });
        return { id: query.where.id };
      },
    },
  };

  return {
    service: createAIAdminModelService({ database }),
    calls,
    database,
  };
}

test("AI models are fetched with routes and usage counts", async () => {
  const { service, calls } = createTestService();

  const result = await service.listModels();

  assert.equal(result.length, 1);
  assert.equal(calls[0].method, "findMany");
  assert.equal(calls[0].query.include.routes.orderBy[0].purpose, "asc");
  assert.equal(
    calls[0].query.include._count.select.usageLogs,
    true
  );
});

test("AI model creation normalizes provider and trims values", async () => {
  const { service, calls } = createTestService();

  const result = await service.createModel({
    provider: " GEMINI ",
    modelName: " gemini-test ",
    version: " v1 ",
  });

  assert.equal(result.provider, "gemini");
  assert.equal(result.modelName, "gemini-test");
  assert.equal(result.version, "v1");
  assert.equal(calls[0].method, "createModel");
});

test("AI model creation rejects missing provider", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.createModel({ modelName: "gemini-test" }),
    { statusCode: 400 }
  );
});

test("AI model creation rejects missing model name", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.createModel({ provider: "gemini" }),
    { statusCode: 400 }
  );
});

test("AI model update changes supported fields", async () => {
  const { service, calls } = createTestService();

  const result = await service.updateModel("model-1", {
    modelName: "gemini-updated",
    isActive: true,
  });

  assert.equal(result.modelName, "gemini-updated");
  assert.deepEqual(calls[0].query.data, {
    modelName: "gemini-updated",
    isActive: true,
  });
});

test("AI model update returns 404 for missing model", async () => {
  const { service, database } = createTestService();

  database.aIModel.update = async () => {
    const error = new Error("Record not found");
    error.code = "P2025";
    throw error;
  };

  await assert.rejects(
    service.updateModel("missing-model", {
      isActive: false,
    }),
    { statusCode: 404 }
  );
});

test("AI route creation accepts a valid active model", async () => {
  const { service, calls } = createTestService();

  const result = await service.createRoute({
    aiModelId: "model-1",
    purpose: "WRITING",
    priority: 5,
  });

  assert.equal(result.id, "route-1");
  assert.equal(result.purpose, "WRITING");
  assert.equal(calls[1].method, "createRoute");
});

test("AI route creation rejects unsupported purpose", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.createRoute({
      aiModelId: "model-1",
      purpose: "READING",
    }),
    { statusCode: 400 }
  );
});

test("AI route creation rejects negative priority", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.createRoute({
      aiModelId: "model-1",
      purpose: "WRITING",
      priority: -1,
    }),
    { statusCode: 400 }
  );
});

test("AI route creation rejects inactive model", async () => {
  const { service, database } = createTestService();

  database.aIModel.findUnique = async () => ({
    id: "model-1",
    isActive: false,
  });

  await assert.rejects(
    service.createRoute({
      aiModelId: "model-1",
      purpose: "WRITING",
    }),
    { statusCode: 400 }
  );
});

test("AI route update changes priority and enabled status", async () => {
  const { service, calls } = createTestService();

  const result = await service.updateRoute("route-1", {
    priority: 10,
    isEnabled: false,
  });

  assert.equal(result.priority, 10);
  assert.equal(result.isEnabled, false);
  assert.deepEqual(calls[0].query.data, {
    priority: 10,
    isEnabled: false,
  });
});

test("AI route update rejects invalid priority", async () => {
  const { service } = createTestService();

  await assert.rejects(
    service.updateRoute("route-1", {
      priority: -5,
    }),
    { statusCode: 400 }
  );
});

test("AI route deletion prevents deleting the last enabled route", async () => {
  const { service, database } = createTestService();

  database.aIModelRoute.count = async () => 1;

  await assert.rejects(
    service.deleteRoute("route-1"),
    { statusCode: 400 }
  );
});

test("AI route deletion succeeds when another enabled route exists", async () => {
  const { service, calls } = createTestService();

  const result = await service.deleteRoute("route-1");

  assert.equal(result.id, "route-1");
  assert.ok(calls.some((call) => call.method === "deleteRoute"));
});
