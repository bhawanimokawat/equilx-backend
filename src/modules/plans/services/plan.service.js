
const { Prisma } = require("@prisma/client");
const { prisma } = require("../../../config/database");

// --------------------------------------------------
// Shared queries
// --------------------------------------------------

const getCurrentPlanVersion = (now = new Date()) => ({
  where: {
    effectiveFrom: {
      lte: now,
    },
  },
  orderBy: [
    { effectiveFrom: "desc" },
    { version: "desc" },
  ],
  take: 1,
});

// --------------------------------------------------
// Public plan APIs
// --------------------------------------------------

const listPlans = async ({ ownerType } = {}) => {
  const now = new Date();

  const plans = await prisma.plan.findMany({
    where: {
      isActive: true,
      ...(ownerType ? { ownerType } : {}),
    },
    include: {
      versions: getCurrentPlanVersion(now),
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return plans
    .filter((plan) => plan.versions.length > 0)
    .map((plan) => ({
      id: plan.id,
      code: plan.code,
      name: plan.name,
      ownerType: plan.ownerType,
      description: plan.description,
      version: plan.versions[0],
    }));
};

const getPlanByCode = async (code) => {
  const now = new Date();

  const plan = await prisma.plan.findFirst({
    where: {
      code,
      isActive: true,
    },
    include: {
      versions: getCurrentPlanVersion(now),
    },
  });

  if (!plan || plan.versions.length === 0) {
    return null;
  }

  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    ownerType: plan.ownerType,
    description: plan.description,
    version: plan.versions[0],
  };
};

// --------------------------------------------------
// Super Admin: plan management
// --------------------------------------------------

const listAdminPlans = async ({ ownerType, isActive } = {}) => {
  return prisma.plan.findMany({
    where: {
      ...(ownerType ? { ownerType } : {}),
      ...(typeof isActive === "boolean" ? { isActive } : {}),
    },
    include: {
      versions: {
        orderBy: {
          version: "desc",
        },
      },
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

const getAdminPlanById = async (planId) => {
  return prisma.plan.findUnique({
    where: {
      id: planId,
    },
    include: {
      versions: {
        orderBy: {
          version: "desc",
        },
      },
      _count: {
        select: {
          subscriptions: true,
        },
      },
    },
  });
};

// --------------------------------------------------
// Create plan with initial version
// --------------------------------------------------

const createPlan = async ({
  code,
  name,
  ownerType,
  description = null,
  version,
}) => {
  return prisma.plan.create({
    data: {
      code,
      name,
      ownerType,
      description,
      isActive: true,
      versions: {
        create: {
          version: 1,
          priceInclGst: version.priceInclGst,
          currency: version.currency || "INR",
          gstRate: version.gstRate ?? "18.00",
          durationMonths: version.durationMonths ?? null,
          fullMockQuota: version.fullMockQuota ?? null,
          practiceQuota: version.practiceQuota ?? null,
          isLifetime: version.isLifetime ?? false,
          effectiveFrom: version.effectiveFrom
            ? new Date(version.effectiveFrom)
            : new Date(),
        },
      },
    },
    include: {
      versions: true,
    },
  });
};

// --------------------------------------------------
// Update plan metadata
// --------------------------------------------------

const updatePlan = async (planId, data) => {
  const updateData = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.description !== undefined) {
    updateData.description = data.description;
  }

  return prisma.plan.update({
    where: {
      id: planId,
    },
    data: updateData,
    include: {
      versions: {
        orderBy: {
          version: "desc",
        },
      },
    },
  });
};

// --------------------------------------------------
// Activate / deactivate plan
// --------------------------------------------------

const updatePlanStatus = async (planId, isActive) => {
  return prisma.plan.update({
    where: {
      id: planId,
    },
    data: {
      isActive,
    },
  });
};

// --------------------------------------------------
// Create a new immutable pricing version
// --------------------------------------------------

const createPlanVersion = async (planId, versionData) => {
  // Retry serialization conflicts caused by concurrent
  // requests creating a new version for the same plan.
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const plan = await tx.plan.findUnique({
            where: {
              id: planId,
            },
            select: {
              id: true,
            },
          });

          if (!plan) {
            const error = new Error("Plan not found.");
            error.statusCode = 404;
            error.code = "PLAN_NOT_FOUND";
            throw error;
          }

          const latestVersion = await tx.planVersion.aggregate({
            where: {
              planId,
            },
            _max: {
              version: true,
            },
          });

          const nextVersion =
            (latestVersion._max.version || 0) + 1;

          return tx.planVersion.create({
            data: {
              planId,
              version: nextVersion,
              priceInclGst: versionData.priceInclGst,
              currency: versionData.currency || "INR",
              gstRate: versionData.gstRate ?? "18.00",
              durationMonths: versionData.durationMonths ?? null,
              fullMockQuota: versionData.fullMockQuota ?? null,
              practiceQuota: versionData.practiceQuota ?? null,
              isLifetime: versionData.isLifetime ?? false,
              effectiveFrom: versionData.effectiveFrom
                ? new Date(versionData.effectiveFrom)
                : new Date(),
            },
          });
        },
        {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        }
      );
    } catch (error) {
      const retryable =
        error.code === "P2034" || error.code === "P2002";

      if (!retryable || attempt === 3) {
        throw error;
      }
    }
  }
};

module.exports = {
  // Public APIs
  listPlans,
  getPlanByCode,

  // Admin APIs
  listAdminPlans,
  getAdminPlanById,
  createPlan,
  updatePlan,
  updatePlanStatus,
  createPlanVersion,
};
