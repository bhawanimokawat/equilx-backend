
const { prisma } = require("../../../../config/database");

function fail(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
}

function parseDate(value, field) {
  if (value === undefined) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    fail(`${field} must be a valid date.`);
  }

  return date;
}

function buildFilters(query = {}) {
  const from = parseDate(query.from, "from");
  const to = parseDate(query.to, "to");

  if (from && to && from > to) {
    fail("The from date must be before the to date.");
  }

  if (from && to && to - from > 366 * 24 * 60 * 60 * 1000) {
    fail("The maximum analytics date range is 366 days.");
  }

  const where = {};

  if (from || to) {
    where.createdAt = {};

    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  if (query.jobType !== undefined) {
    const allowed = [
      "WRITING",
      "SPEAKING",
      "TRANSCRIPTION",
    ];

    if (!allowed.includes(query.jobType)) {
      fail("Unsupported AI job type.");
    }

    where.jobType = query.jobType;
  }

  if (query.aiModelId !== undefined) {
    if (
      typeof query.aiModelId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.aiModelId)
    ) {
      fail("Invalid AI model ID.");
    }

    where.aiModelId = query.aiModelId;
  }

  return { where, from, to };
}

function sum(values) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function createAIAdminUsageService({ database = prisma } = {}) {
  async function getSummary(query = {}) {
    const { where } = buildFilters(query);

    const [aggregate, currencies] = await Promise.all([
      database.aIUsageLog.aggregate({
        where,
        _count: { _all: true },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          estimatedCost: true,
        },
      }),

      database.aIUsageLog.groupBy({
        by: ["currency"],
        where,
        _sum: { estimatedCost: true },
        _count: { _all: true },
      }),
    ]);

    return {
      totalRequests: aggregate._count._all,
      inputTokens: aggregate._sum.inputTokens || 0,
      outputTokens: aggregate._sum.outputTokens || 0,
      totalTokens:
        (aggregate._sum.inputTokens || 0) +
        (aggregate._sum.outputTokens || 0),
      // Null means no cost was recorded for any matching usage.
      estimatedCost:
        aggregate._sum.estimatedCost === null
          ? null
          : Number(aggregate._sum.estimatedCost),
      currencies: currencies.map((item) => ({
        currency: item.currency,
        requests: item._count._all,
        estimatedCost:
          item._sum.estimatedCost === null
            ? null
            : Number(item._sum.estimatedCost),
      })),
    };
  }

  async function getBreakdown(query = {}) {
    const { where } = buildFilters(query);

    const [groups, models] = await Promise.all([
      database.aIUsageLog.groupBy({
        by: ["aiModelId", "jobType", "currency"],
        where,
        _count: { _all: true },
        _sum: {
          inputTokens: true,
          outputTokens: true,
          estimatedCost: true,
        },
      }),

      database.aIModel.findMany({
        select: {
          id: true,
          provider: true,
          modelName: true,
        },
      }),
    ]);

    const modelMap = new Map(
      models.map((model) => [model.id, model])
    );

    return groups.map((group) => ({
      model: modelMap.get(group.aiModelId) || null,
      aiModelId: group.aiModelId,
      jobType: group.jobType,
      currency: group.currency,
      requests: group._count._all,
      inputTokens: group._sum.inputTokens || 0,
      outputTokens: group._sum.outputTokens || 0,
      totalTokens:
        (group._sum.inputTokens || 0) +
        (group._sum.outputTokens || 0),
      estimatedCost:
        group._sum.estimatedCost === null
          ? null
          : Number(group._sum.estimatedCost),
    }));
  }

  async function getTrends(query = {}) {
    const { where } = buildFilters(query);

    const records = await database.aIUsageLog.findMany({
      where,
      select: {
        createdAt: true,
        inputTokens: true,
        outputTokens: true,
        estimatedCost: true,
        currency: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const buckets = new Map();

    for (const record of records) {
      const date = record.createdAt.toISOString().slice(0, 10);
      const key = `${date}:${record.currency}`;

      if (!buckets.has(key)) {
        buckets.set(key, {
          date,
          currency: record.currency,
          requests: 0,
          inputTokens: 0,
          outputTokens: 0,
          estimatedCost: null,
          costRecorded: false,
        });
      }

      const bucket = buckets.get(key);

      bucket.requests += 1;
      bucket.inputTokens += record.inputTokens;
      bucket.outputTokens += record.outputTokens;

      if (record.estimatedCost !== null) {
        if (!bucket.costRecorded) {
          bucket.estimatedCost = 0;
          bucket.costRecorded = true;
        }

        bucket.estimatedCost += Number(record.estimatedCost);
      }
    }

    return [...buckets.values()]
      .map(({ costRecorded, ...bucket }) => bucket)
      .sort((a, b) =>
        a.date.localeCompare(b.date) ||
        a.currency.localeCompare(b.currency)
      );
  }

  async function exportUsage(query = {}) {
    const { where } = buildFilters(query);

    const records = await database.aIUsageLog.findMany({
      where,
      take: 10001,
      orderBy: { createdAt: "desc" },
      include: {
        model: {
          select: {
            provider: true,
            modelName: true,
          },
        },
      },
    });

    if (records.length > 10000) {
      fail("Export is limited to 10,000 records. Narrow the date range.", 400);
    }

    const columns = [
      "id",
      "userId",
      "provider",
      "modelName",
      "jobType",
      "inputTokens",
      "outputTokens",
      "estimatedCost",
      "currency",
      "createdAt",
    ];

    function escapeCSV(value) {
      if (value === null || value === undefined) return "";

      const text = String(value);

      return `"${text.replace(/"/g, '""')}"`;
    }

    const rows = records.map((record) => [
      record.id,
      record.userId,
      record.model?.provider,
      record.model?.modelName,
      record.jobType,
      record.inputTokens,
      record.outputTokens,
      record.estimatedCost,
      record.currency,
      record.createdAt.toISOString(),
    ]);

    return [
      columns.join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");
  }

  return {
    getSummary,
    getBreakdown,
    getTrends,
    exportUsage,
  };
}

const service = createAIAdminUsageService();

module.exports = {
  ...service,
  createAIAdminUsageService,
};
