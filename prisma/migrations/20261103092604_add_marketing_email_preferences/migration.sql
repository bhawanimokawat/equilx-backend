-- AlterTable
ALTER TABLE "NotificationPreference" ADD COLUMN     "lastMarketingEmailAt" TIMESTAMP(3),
ADD COLUMN     "marketingEmailConsentAt" TIMESTAMP(3),
ADD COLUMN     "marketingEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingEmailUnsubscribedAt" TIMESTAMP(3);
