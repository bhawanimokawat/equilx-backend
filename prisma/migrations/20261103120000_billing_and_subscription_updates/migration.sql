-- AlterTable
ALTER TABLE "Institute" ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "billingCity" TEXT,
ADD COLUMN     "billingCountry" VARCHAR(2) NOT NULL DEFAULT 'IN',
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "billingLegalName" TEXT,
ADD COLUMN     "billingPhone" TEXT,
ADD COLUMN     "billingPostalCode" VARCHAR(10),
ADD COLUMN     "billingState" TEXT,
ADD COLUMN     "billingStateCode" VARCHAR(2),
ADD COLUMN     "gstin" VARCHAR(15);

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "buyerAddress" TEXT,
ADD COLUMN     "buyerCity" TEXT,
ADD COLUMN     "buyerCountry" VARCHAR(2) NOT NULL DEFAULT 'IN',
ADD COLUMN     "buyerPostalCode" VARCHAR(10),
ADD COLUMN     "buyerState" TEXT,
ADD COLUMN     "buyerStateCode" VARCHAR(2),
ADD COLUMN     "description" TEXT,
ADD COLUMN     "documentType" VARCHAR(20) NOT NULL DEFAULT 'COMMERCIAL',
ADD COLUMN     "sacCode" TEXT,
ADD COLUMN     "sellerAddress" TEXT NOT NULL,
ADD COLUMN     "sellerCountry" VARCHAR(2) NOT NULL DEFAULT 'IN',
ADD COLUMN     "sellerGstin" TEXT,
ADD COLUMN     "sellerLegalName" TEXT NOT NULL,
ADD COLUMN     "sellerState" TEXT,
ADD COLUMN     "sellerStateCode" VARCHAR(2);

-- AlterTable
ALTER TABLE "PlanVersion" DROP COLUMN "maxSeats",
ALTER COLUMN "fullMockQuota" DROP DEFAULT,
ALTER COLUMN "practiceQuota" DROP DEFAULT,
ALTER COLUMN "fullMockQuota" DROP NOT NULL,
ALTER COLUMN "practiceQuota" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "maxSeatsPurchased",
ADD COLUMN     "renewalOfSubscriptionId" UUID;

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "billingCity" TEXT,
ADD COLUMN     "billingCountry" VARCHAR(2) NOT NULL DEFAULT 'IN',
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "billingName" TEXT,
ADD COLUMN     "billingPhone" TEXT,
ADD COLUMN     "billingPostalCode" VARCHAR(10),
ADD COLUMN     "billingState" TEXT,
ADD COLUMN     "billingStateCode" VARCHAR(2),
ADD COLUMN     "gstin" VARCHAR(15);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_paymentId_key" ON "Invoice"("paymentId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_renewalOfSubscriptionId_fkey" FOREIGN KEY ("renewalOfSubscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;