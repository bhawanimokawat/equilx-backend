-- AlterTable
ALTER TABLE "SpeakingRecording" ADD COLUMN     "checksum" TEXT;

-- CreateIndex
CREATE INDEX "SpeakingRecording_submissionId_checksum_deletedAt_idx" ON "SpeakingRecording"("submissionId", "checksum", "deletedAt");
