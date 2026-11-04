-- AlterTable
ALTER TABLE "Batch" ADD COLUMN     "trainerId" UUID;

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN     "batchId" UUID;

-- CreateIndex
CREATE INDEX "Batch_trainerId_idx" ON "Batch"("trainerId");

-- CreateIndex
CREATE INDEX "Conversation_batchId_idx" ON "Conversation"("batchId");

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_trainerId_fkey" FOREIGN KEY ("trainerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
