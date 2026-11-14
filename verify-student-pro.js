require("dotenv").config();

const { prisma } = require("./src/config/database");

async function verifyStudentPro() {
    try {
        const now = new Date();

        const subscriptions = await prisma.subscription.findMany({
            where: {
                status: "ACTIVE",
                plan: {
                    code: "STUDENT_PRO"
                },
                OR: [
                    { startsAt: null },
                    { startsAt: { lte: now } }
                ],
                AND: [
                    {
                        OR: [
                            { endsAt: null },
                            { endsAt: { gt: now } }
                        ]
                    }
                ]
            },
            select: {
                userId: true,
                status: true,
                startsAt: true,
                endsAt: true,
                plan: {
                    select: {
                        code: true
                    }
                }
            }
        });

        const userIds = subscriptions
            .map(item => item.userId)
            .filter(Boolean);

        const preferences = await prisma.notificationPreference.findMany({
            where: {
                userId: { in: userIds }
            },
            select: {
                userId: true,
                marketingEmailEnabled: true,
                marketingEmailUnsubscribedAt: true
            }
        });

        console.log("ACTIVE STUDENT PRO SUBSCRIPTIONS:");
        console.table(subscriptions);

        console.log("MARKETING CONSENT:");
        console.table(preferences);

    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyStudentPro();
