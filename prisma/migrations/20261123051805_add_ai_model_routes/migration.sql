-- CreateTable
CREATE TABLE "AIModelRoute" (
    "id" UUID NOT NULL,
    "aiModelId" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIModelRoute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIModelRoute_purpose_isEnabled_priority_idx" ON "AIModelRoute"("purpose", "isEnabled", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "AIModelRoute_purpose_aiModelId_key" ON "AIModelRoute"("purpose", "aiModelId");

-- AddForeignKey
ALTER TABLE "AIModelRoute" ADD CONSTRAINT "AIModelRoute_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "AIModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
