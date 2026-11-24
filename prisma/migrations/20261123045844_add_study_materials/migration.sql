-- CreateEnum
CREATE TYPE "StudyMaterialStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "StudyMaterial" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "content" TEXT,
    "category" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" TEXT,
    "imageUrl" TEXT,
    "resourceUrl" TEXT,
    "duration" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "StudyMaterialStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "StudyMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyMaterialBookmark" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "materialId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyMaterialBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyMaterial_status_createdAt_idx" ON "StudyMaterial"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StudyMaterial_category_status_idx" ON "StudyMaterial"("category", "status");

-- CreateIndex
CREATE INDEX "StudyMaterial_type_status_idx" ON "StudyMaterial"("type", "status");

-- CreateIndex
CREATE INDEX "StudyMaterialBookmark_userId_createdAt_idx" ON "StudyMaterialBookmark"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudyMaterialBookmark_userId_materialId_key" ON "StudyMaterialBookmark"("userId", "materialId");

-- AddForeignKey
ALTER TABLE "StudyMaterialBookmark" ADD CONSTRAINT "StudyMaterialBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyMaterialBookmark" ADD CONSTRAINT "StudyMaterialBookmark_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "StudyMaterial"("id") ON DELETE CASCADE ON UPDATE CASCADE;
