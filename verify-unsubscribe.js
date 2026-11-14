require("dotenv").config();

const { prisma } = require("./src/config/database");

async function verifyUnsubscribe() {
    try {
        const rows = await prisma.notificationPreference.findMany({
            where: {
                marketingEmailUnsubscribedAt: {
                    not: null
                }
            },
            select: {
                userId: true,
                marketingEmailEnabled: true,
                marketingEmailUnsubscribedAt: true
            }
        });

        console.table(rows);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

verifyUnsubscribe();
