const { prisma } = require("../../../../config/database");

const VALID_SOURCES = ["AI", "TRAINER"];
const VALID_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "NEEDS_REVIEW",
];

function createAIAdminQualityService({ database = prisma } = {}) {
  function buildFilters(query = {}) {
    const where = {};

    if (query.from || query.to) {
      const createdAt = {};

      if (query.from) {
        const from = new Date(query.from);

        if (Number.isNaN(from.getTime())) {
          throw Object.assign(new Error("Invalid from date."), {
            statusCode: 400,
          });
        }

        createdAt.gte = from;
      }

      if (query.to) {
        const to = new Date(query.to);

        if (Number.isNaN(to.getTime())) {
          throw Object.assign(new Error("Invalid to date."), {
            statusCode: 400,
          });
        }

        createdAt.lte = to;
      }

      if (
        createdAt.gte &&
        createdAt.lte &&
        createdAt.gte > createdAt.lte
      ) {
        throw Object.assign(
          new Error("From date cannot be after to date."),
          { statusCode: 400 }
        );
      }

      where.createdAt = createdAt;
    }

    if (query.source) {
      if (!VALID_SOURCES.includes(query.source)) {
        throw Object.assign(new Error("Invalid evaluation source."), {
          statusCode: 400,
        });
      }

      where.source = query.source;
    }

    if (query.status) {
      if (!VALID_STATUSES.includes(query.status)) {
        throw Object.assign(new Error("Invalid evaluation status."), {
          statusCode: 400,
        });
      }

      where.status = query.status;
    }

    return where;
  }

  async function getSummary(query = {}) {
    const where = buildFilters(query);

    const [writing, speaking, writingStatuses, speakingStatuses] =
      await Promise.all([
        database.writingEvaluation.aggregate({
          where,
          _count: { _all: true },
          _avg: { overallBand: true },
        }),

        database.speakingEvaluation.aggregate({
          where,
          _count: { _all: true },
          _avg: { overallBand: true },
        }),

        database.writingEvaluation.groupBy({
          by: ["status"],
          where,
          _count: { _all: true },
        }),

        database.speakingEvaluation.groupBy({
          by: ["status"],
          where,
          _count: { _all: true },
        }),
      ]);

    function statusTotals(groups) {
      const totals = Object.fromEntries(
        VALID_STATUSES.map((status) => [status, 0])
      );

      for (const group of groups) {
        totals[group.status] = group._count._all;
      }

      return totals;
    }

    const writingStatusCounts = statusTotals(writingStatuses);
    const speakingStatusCounts = statusTotals(speakingStatuses);

    const writingTotal = writing._count._all;
    const speakingTotal = speaking._count._all;

    const writingCompleted = writingStatusCounts.COMPLETED;
    const speakingCompleted = speakingStatusCounts.COMPLETED;

    return {
      totalEvaluations: writingTotal + speakingTotal,
      writing: {
        total: writingTotal,
        statuses: writingStatusCounts,
        averageOverallBand:
          writing._avg.overallBand === null
            ? null
            : Number(writing._avg.overallBand),
      },
      speaking: {
        total: speakingTotal,
        statuses: speakingStatusCounts,
        averageOverallBand:
          speaking._avg.overallBand === null
            ? null
            : Number(speaking._avg.overallBand),
      },
      completed: writingCompleted + speakingCompleted,
      pending:
        writingStatusCounts.PENDING +
        speakingStatusCounts.PENDING,
      processing:
        writingStatusCounts.PROCESSING +
        speakingStatusCounts.PROCESSING,
      failed:
        writingStatusCounts.FAILED +
        speakingStatusCounts.FAILED,
      needsReview:
        writingStatusCounts.NEEDS_REVIEW +
        speakingStatusCounts.NEEDS_REVIEW,
    };
  }

  async function getBreakdown(query = {}) {
    const where = buildFilters(query);

    const [writing, speaking] = await Promise.all([
      database.writingEvaluation.aggregate({
        where,
        _count: { _all: true },
        _avg: {
          taskResponseBand: true,
          coherenceBand: true,
          lexicalBand: true,
          grammarBand: true,
          overallBand: true,
        },
      }),

      database.speakingEvaluation.aggregate({
        where,
        _count: { _all: true },
        _avg: {
          fluencyBand: true,
          lexicalBand: true,
          grammarBand: true,
          pronunciationBand: true,
          overallBand: true,
        },
      }),
    ]);

    function average(value) {
      return value === null ? null : Number(value);
    }

    return {
      writing: {
        total: writing._count._all,
        criteria: {
          taskResponse: average(writing._avg.taskResponseBand),
          coherence: average(writing._avg.coherenceBand),
          lexical: average(writing._avg.lexicalBand),
          grammar: average(writing._avg.grammarBand),
          overall: average(writing._avg.overallBand),
        },
      },
      speaking: {
        total: speaking._count._all,
        criteria: {
          fluency: average(speaking._avg.fluencyBand),
          lexical: average(speaking._avg.lexicalBand),
          grammar: average(speaking._avg.grammarBand),
          pronunciation: average(speaking._avg.pronunciationBand),
          overall: average(speaking._avg.overallBand),
        },
      },
    };
  }

  async function getTrends(query = {}) {
    const where = buildFilters(query);

    const [writing, speaking] = await Promise.all([
      database.writingEvaluation.findMany({
        where,
        select: {
          createdAt: true,
          status: true,
          overallBand: true,
        },
        orderBy: { createdAt: "asc" },
      }),

      database.speakingEvaluation.findMany({
        where,
        select: {
          createdAt: true,
          status: true,
          overallBand: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const buckets = new Map();

    function addRecords(records, type) {
      for (const record of records) {
        const date = record.createdAt.toISOString().slice(0, 10);

        if (!buckets.has(date)) {
          buckets.set(date, {
            date,
            writing: 0,
            speaking: 0,
            completed: 0,
            failed: 0,
            total: 0,
            bandTotal: 0,
            bandCount: 0,
          });
        }

        const bucket = buckets.get(date);

        bucket[type] += 1;
        bucket.total += 1;

        if (record.status === "COMPLETED") {
          bucket.completed += 1;
        }

        if (record.status === "FAILED") {
          bucket.failed += 1;
        }

        if (record.overallBand !== null) {
          bucket.bandTotal += Number(record.overallBand);
          bucket.bandCount += 1;
        }
      }
    }

    addRecords(writing, "writing");
    addRecords(speaking, "speaking");

    return [...buckets.values()]
      .map(({ bandTotal, bandCount, ...bucket }) => ({
        ...bucket,
        averageOverallBand:
          bandCount === 0 ? null : bandTotal / bandCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  return {
    getSummary,
    getBreakdown,
    getTrends,
  };
}

const service = createAIAdminQualityService();

module.exports = {
  ...service,
  createAIAdminQualityService,
};