-- CreateTable
CREATE TABLE "ai_settings" (
    "id" UUID NOT NULL,
    "defaultProvider" TEXT NOT NULL DEFAULT 'gemini',
    "defaultModel" TEXT NOT NULL,
    "writingModel" TEXT NOT NULL,
    "speakingModel" TEXT NOT NULL,
    "transcriptionModel" TEXT NOT NULL,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "maxOutputTokens" INTEGER NOT NULL DEFAULT 4096,
    "dailyBudget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "monthlyBudget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "freeDailyLimit" INTEGER NOT NULL DEFAULT 20,
    "proDailyLimit" INTEGER NOT NULL DEFAULT 100,
    "instituteDailyLimit" INTEGER NOT NULL DEFAULT 500,
    "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "evaluationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "loggingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_settings_pkey" PRIMARY KEY ("id")
);
