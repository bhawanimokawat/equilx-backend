require("dotenv").config();

const { prisma } = require("./src/config/database");

async function checkConsent() {
    try {
        const rows = await prisma.notificationPreference.findMany({
            where: {
                marketingEmailEnabled: true,
                marketingEmailUnsubscribedAt: null
            },
            select: {
                userId: true,
                marketingEmailEnabled: true,
                lastMarketingEmailAt: true
            }
        });

        console.table(rows);
    } catch (error) {
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

checkConsent();
