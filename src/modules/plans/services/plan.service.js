const { prisma } = require("../../../config/database");

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

  // Do not expose plans that have no currently effective version.
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

module.exports = {
  listPlans,
  getPlanByCode,
};
