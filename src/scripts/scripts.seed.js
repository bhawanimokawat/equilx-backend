require("dotenv").config();

const {
    prisma,
    disconnectDatabase,
} = require("../config/database");

const plans = [
    {
        code: "FREE",
        name: "Free Individual",
        ownerType: "INDIVIDUAL",
        description: "Free IELTS learning plan for individual students.",
        version: 1,
        priceInclGst: "0.00",
        currency: "INR",
        gstRate: "18.00",
        durationMonths: null,
        fullMockQuota: 2,
        practiceQuota: 8,
        isLifetime: true,
    },
    {
        code: "STUDENT_PRO",
        name: "Student Pro",
        ownerType: "INDIVIDUAL",
        description: "Premium IELTS learning plan for individual students.",
        version: 1,
        priceInclGst: "1500.00",
        currency: "INR",
        gstRate: "18.00",
        durationMonths: 2,
        fullMockQuota: null,
        practiceQuota: null,
        isLifetime: false,
    },
    {
        code: "INSTITUTE_6_MONTH",
        name: "Institute 6 Months",
        ownerType: "INSTITUTE",
        description: "Six-month IELTS platform subscription for institutes.",
        version: 1,
        priceInclGst: "12000.00",
        currency: "INR",
        gstRate: "18.00",
        durationMonths: 6,
        fullMockQuota: null,
        practiceQuota: null,
        isLifetime: false,
    },
    {
        code: "INSTITUTE_12_MONTH",
        name: "Institute 12 Months",
        ownerType: "INSTITUTE",
        description: "Twelve-month IELTS platform subscription for institutes.",
        version: 1,
        priceInclGst: "17000.00",
        currency: "INR",
        gstRate: "18.00",
        durationMonths: 12,
        fullMockQuota: null,
        practiceQuota: null,
        isLifetime: false,
    },
];

async function seedPlans() {
    console.log("Starting Equilx plan seeding...\n");

    const results = await prisma.$transaction(async (tx) => {
        const seededPlans = [];

        for (const item of plans) {
            const {
                version,
                priceInclGst,
                currency,
                gstRate,
                durationMonths,
                fullMockQuota,
                practiceQuota,
                isLifetime,
                ...planDetails
            } = item;

            // Create or update plan metadata.
            const plan = await tx.plan.upsert({
                where: {
                    code: planDetails.code,
                },
                update: {
                    name: planDetails.name,
                    ownerType: planDetails.ownerType,
                    description: planDetails.description,
                    isActive: true,
                },
                create: {
                    ...planDetails,
                    isActive: true,
                },
            });

            // Never silently modify an existing historical plan version.
            const existingVersion = await tx.planVersion.findUnique({
                where: {
                    planId_version: {
                        planId: plan.id,
                        version,
                    },
                },
            });

            if (existingVersion) {
                const matches =
                    existingVersion.priceInclGst.eq(priceInclGst) &&
                    existingVersion.currency === currency &&
                    existingVersion.gstRate.eq(gstRate) &&
                    existingVersion.durationMonths === durationMonths &&
                    existingVersion.fullMockQuota === fullMockQuota &&
                    existingVersion.practiceQuota === practiceQuota &&
                    existingVersion.isLifetime === isLifetime;

                if (!matches) {
                    throw new Error(
                        `Plan version conflict for ${plan.code} version ${version}. ` +
                        "Create a new plan version instead of modifying an existing version."
                    );
                }

                seededPlans.push({
                    code: plan.code,
                    name: plan.name,
                    version,
                    action: "Already exists",
                });

                continue;
            }

            await tx.planVersion.create({
                data: {
                    plan: {
                        connect: {
                            id: plan.id,
                        },
                    },
                    version,
                    priceInclGst,
                    currency,
                    gstRate,
                    durationMonths,
                    fullMockQuota,
                    practiceQuota,
                    isLifetime,
                    effectiveFrom: new Date(),
                },
            });

            seededPlans.push({
                code: plan.code,
                name: plan.name,
                version,
                action: "Created",
            });
        }

        return seededPlans;
    });

    console.log("Plan seeding completed successfully:\n");

    console.table(results);
}

seedPlans()
    .catch((error) => {
        console.error("Plan seeding failed:", error.message);
        process.exitCode = 1;
    })
    .finally(async () => {
        await disconnectDatabase();
    });
