-- AlterTable
ALTER TABLE "Attempt" ADD COLUMN     "moduleId" UUID,
ADD COLUMN     "partId" UUID;

-- CreateIndex
CREATE INDEX "Attempt_moduleId_idx" ON "Attempt"("moduleId");

-- CreateIndex
CREATE INDEX "Attempt_partId_idx" ON "Attempt"("partId");

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "TestModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_partId_fkey" FOREIGN KEY ("partId") REFERENCES "TestPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
