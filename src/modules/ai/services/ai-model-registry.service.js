
const { prisma } = require("../../../config/database");
const aiConfig = require("../config/ai.config");

const PROVIDER = "gemini";

// Fixed PostgreSQL advisory-lock keys.
// Prevents duplicate registry initialization across server instances.
const LOCK_NAMESPACE = 20261123;
const LOCK_ID = 1;

async function initializeAIModelRegistry() {
    if (aiConfig.provider !== PROVIDER) {
        throw new Error(
            `AI model registry currently supports only the ${PROVIDER} provider.`
        );
    }

    const catalog = aiConfig.gemini.modelCatalog;

    if (!Array.isArray(catalog) || catalog.length === 0) {
        throw new Error("AI model catalog is empty or invalid.");
    }

    return prisma.$transaction(async (tx) => {
        // Serialize registry initialization across application instances.
        await tx.$executeRaw`
  SELECT pg_advisory_xact_lock(
    20261123::int4,
    1::int4
  )
`;
        const summary = {
            modelsCreated: 0,
            routesCreated: 0,
            existingModels: 0,
            existingRoutes: 0,
            inactiveModelsSkipped: 0,
        };

        // Register configured models first.
        for (const catalogModel of catalog) {
            const { modelName, purposes } = catalogModel;

            if (
                typeof modelName !== "string" ||
                !modelName.trim() ||
                !Array.isArray(purposes) ||
                purposes.length === 0
            ) {
                throw new Error("Invalid model entry in AI model catalog.");
            }

            let aiModel = await tx.aIModel.findFirst({
                where: {
                    provider: PROVIDER,
                    modelName,
                    version: null,
                },
            });

            if (!aiModel) {
                aiModel = await tx.aIModel.create({
                    data: {
                        provider: PROVIDER,
                        modelName,
                        isActive: true,
                    },
                });

                summary.modelsCreated += 1;
            } else {
                summary.existingModels += 1;
            }

            // Never automatically reactivate a model disabled by Super Admin.
            if (!aiModel.isActive) {
                summary.inactiveModelsSkipped += 1;
                continue;
            }

            // Create routes without modifying existing Super Admin priorities.
            for (const purpose of purposes) {
                const existingRoute = await tx.aIModelRoute.findFirst({
                    where: {
                        aiModelId: aiModel.id,
                        purpose,
                    },
                });

                if (existingRoute) {
                    summary.existingRoutes += 1;
                    continue;
                }

                const existingRoutes = await tx.aIModelRoute.findMany({
                    where: {
                        purpose,
                    },
                    select: {
                        priority: true,
                    },
                    orderBy: {
                        priority: "desc",
                    },
                    take: 1,
                });

                // First configured model gets priority 0.
                // Newly registered models are appended after existing routes.
                const priority =
                    existingRoutes.length === 0
                        ? 0
                        : existingRoutes[0].priority + 10;

                await tx.aIModelRoute.create({
                    data: {
                        aiModelId: aiModel.id,
                        purpose,
                        priority,
                        isEnabled: true,
                    },
                });

                summary.routesCreated += 1;
            }
        }

        console.log("[AI MODEL REGISTRY] Initialization completed.", summary);

        return summary;
    });
}

module.exports = {
    initializeAIModelRegistry,
};
