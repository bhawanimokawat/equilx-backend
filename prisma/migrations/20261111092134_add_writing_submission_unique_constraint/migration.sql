/*
  Warnings:

  - A unique constraint covering the columns `[attemptId,taskNumber]` on the table `WritingSubmission` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "WritingSubmission_attemptId_taskNumber_idx";

-- CreateIndex
CREATE UNIQUE INDEX "WritingSubmission_attemptId_taskNumber_key" ON "WritingSubmission"("attemptId", "taskNumber");
