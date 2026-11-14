/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `PaymentRefund` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PaymentRefund" ADD COLUMN     "idempotencyKey" VARCHAR(128);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRefund_idempotencyKey_key" ON "PaymentRefund"("idempotencyKey");
