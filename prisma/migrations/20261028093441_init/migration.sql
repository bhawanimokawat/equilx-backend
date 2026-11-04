-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('USER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('EMAIL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('INSTITUTE_STUDENT', 'TRAINER', 'INSTITUTE_ADMIN');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'REVOKED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED_PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TwoFactorPurpose" AS ENUM ('LOGIN');

-- CreateEnum
CREATE TYPE "InstituteStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PlanCode" AS ENUM ('FREE', 'STUDENT_PRO', 'INSTITUTE_6_MONTH', 'INSTITUTE_12_MONTH');

-- CreateEnum
CREATE TYPE "PlanOwnerType" AS ENUM ('INDIVIDUAL', 'INSTITUTE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CREATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('RAZORPAY');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('ISSUED', 'VOID');

-- CreateEnum
CREATE TYPE "SubscriptionChangeType" AS ENUM ('ACTIVATED', 'RENEWED', 'UPGRADED', 'DOWNGRADED', 'CANCELLED', 'EXPIRED', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "UsageType" AS ENUM ('FULL_MOCK', 'PRACTICE');

-- CreateEnum
CREATE TYPE "IELTSSection" AS ENUM ('LISTENING', 'READING', 'WRITING', 'SPEAKING');

-- CreateEnum
CREATE TYPE "TestCategory" AS ENUM ('ACADEMIC', 'GENERAL_TRAINING');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MULTIPLE_CHOICE', 'MULTIPLE_SELECT', 'TRUE_FALSE_NOT_GIVEN', 'YES_NO_NOT_GIVEN', 'SHORT_ANSWER', 'SENTENCE_COMPLETION', 'SUMMARY_COMPLETION', 'NOTE_COMPLETION', 'FORM_COMPLETION', 'TABLE_COMPLETION', 'MATCHING', 'MATCHING_HEADINGS', 'MATCHING_INFORMATION', 'MATCHING_FEATURES', 'MAP_LABELING', 'DIAGRAM_LABELING', 'FLOW_CHART_COMPLETION', 'GAP_FILL', 'ESSAY', 'LETTER', 'REPORT', 'SPEAKING_RESPONSE');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "EvaluationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "EvaluationSource" AS ENUM ('AI', 'TRAINER');

-- CreateEnum
CREATE TYPE "SpeakingSessionStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "AIJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AIJobType" AS ENUM ('WRITING_EVALUATION', 'SPEAKING_EVALUATION', 'TRANSCRIPTION', 'FEEDBACK_GENERATION');

-- CreateEnum
CREATE TYPE "RecordingConsentStatus" AS ENUM ('NOT_REQUESTED', 'GRANTED', 'DECLINED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AssignmentTargetStatus" AS ENUM ('ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AssignmentTargetSource" AS ENUM ('DIRECT', 'BATCH');

-- CreateEnum
CREATE TYPE "ConversationType" AS ENUM ('DIRECT', 'INSTITUTE_GROUP');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ConversationParticipantRole" AS ENUM ('MEMBER', 'ADMIN');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'EDITED', 'DELETED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('NEW_MESSAGE', 'ASSIGNMENT_CREATED', 'ASSIGNMENT_DUE', 'EVALUATION_COMPLETED', 'ENROLLMENT_UPDATE', 'PAYMENT_UPDATE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'DEMO_BOOKED', 'NEGOTIATION', 'ENROLLED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadActivityType" AS ENUM ('CALL', 'EMAIL', 'MEETING', 'NOTE', 'FOLLOW_UP', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadConsentType" AS ENUM ('MARKETING_EMAIL', 'MARKETING_SMS', 'MARKETING_CALL', 'OTHER');

-- CreateEnum
CREATE TYPE "LeadConsentStatus" AS ENUM ('GRANTED', 'DENIED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "LeadFollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SecurityEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'TWO_FACTOR_FAILURE', 'PASSWORD_CHANGED', 'PASSWORD_RESET', 'TOKEN_REVOKED', 'ACCESS_DENIED', 'SUSPICIOUS_ACTIVITY', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED');

-- CreateEnum
CREATE TYPE "SecuritySeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "DeletionTargetType" AS ENUM ('USER', 'INSTITUTE');

-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('REQUESTED', 'VERIFICATION_REQUIRED', 'VERIFIED', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "RetentionJobType" AS ENUM ('AUDIT_LOGS', 'SECURITY_EVENTS', 'ATTEMPT_DETAILS', 'WRITING_SPEAKING_DETAILS', 'MESSAGES', 'ATTACHMENTS', 'NOTIFICATIONS', 'CRM_LEADS', 'ACCOUNT_DELETION', 'INSTITUTE_DELETION');

-- CreateEnum
CREATE TYPE "RetentionJobStatus" AS ENUM ('RUNNING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED');

-- CreateEnum
CREATE TYPE "RetentionHoldScope" AS ENUM ('DATA_CATEGORY', 'USER', 'INSTITUTE', 'RECORD');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "platformRole" "PlatformRole" NOT NULL DEFAULT 'USER',
    "emailVerifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "displayName" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthIdentity" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerSubject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorChallenge" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "purpose" "TwoFactorPurpose" NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TwoFactorChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institute" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "InstituteStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteMembership" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstituteMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipInvitation" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "invitedByUserId" UUID NOT NULL,
    "invitedUserId" UUID,
    "inviteeEmail" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Batch" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchMember" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainerStudent" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "trainerUserId" UUID NOT NULL,
    "studentUserId" UUID NOT NULL,
    "assignedByUserId" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "TrainerStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "code" "PlanCode" NOT NULL,
    "name" TEXT NOT NULL,
    "ownerType" "PlanOwnerType" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanVersion" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "priceInclGst" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    "durationMonths" INTEGER,
    "maxSeats" INTEGER,
    "fullMockQuota" INTEGER NOT NULL DEFAULT 0,
    "practiceQuota" INTEGER NOT NULL DEFAULT 0,
    "isLifetime" BOOLEAN NOT NULL DEFAULT false,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "planVersionId" UUID NOT NULL,
    "userId" UUID,
    "instituteId" UUID,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "priceInclGst" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "gstRate" DECIMAL(5,2) NOT NULL,
    "durationMonths" INTEGER,
    "maxSeatsPurchased" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
    "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
    "amountInclGst" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "providerOrderId" TEXT,
    "providerPaymentId" TEXT,
    "idempotencyKey" TEXT,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" UUID NOT NULL,
    "paymentId" UUID,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'RAZORPAY',
    "providerEventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadHash" TEXT,
    "signatureVerifiedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "paymentId" UUID,
    "invoiceNumber" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "subtotal" DECIMAL(12,2) NOT NULL,
    "gstRate" DECIMAL(5,2) NOT NULL,
    "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerEmail" TEXT NOT NULL,
    "buyerGstin" TEXT,
    "placeOfSupply" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionChange" (
    "id" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "changeType" "SubscriptionChangeType" NOT NULL,
    "previousStatus" "SubscriptionStatus",
    "newStatus" "SubscriptionStatus",
    "details" JSONB,
    "changedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRefund" (
    "id" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "providerRefundId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
    "reason" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageCounter" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "usageType" "UsageType" NOT NULL,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Book" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "bookNumber" INTEGER,
    "publisher" TEXT,
    "category" "TestCategory",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Test" (
    "id" UUID NOT NULL,
    "bookId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "testNumber" INTEGER NOT NULL,
    "category" "TestCategory" NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestVersion" (
    "id" UUID NOT NULL,
    "testId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "contentChecksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestModule" (
    "id" UUID NOT NULL,
    "testVersionId" UUID NOT NULL,
    "section" "IELTSSection" NOT NULL,
    "position" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "instructions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestPart" (
    "id" UUID NOT NULL,
    "testModuleId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "instructions" JSONB,
    "audioAssetKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionGroup" (
    "id" UUID NOT NULL,
    "testPartId" UUID NOT NULL,
    "title" TEXT,
    "instructions" JSONB,
    "passage" JSONB,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" UUID NOT NULL,
    "testPartId" UUID NOT NULL,
    "questionGroupId" UUID,
    "questionNumber" INTEGER NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "content" JSONB NOT NULL,
    "marks" DECIMAL(5,2) NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnswerKey" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "acceptedAnswers" JSONB NOT NULL,
    "explanation" JSONB,
    "markingRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnswerKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BandConversionVersion" (
    "id" UUID NOT NULL,
    "testVersionId" UUID NOT NULL,
    "section" "IELTSSection" NOT NULL,
    "version" INTEGER NOT NULL,
    "conversionTable" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BandConversionVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attempt" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "testVersionId" UUID NOT NULL,
    "usageType" "UsageType" NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deadlineAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "lastSavedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptAnswer" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "answer" JSONB,
    "firstSavedAt" TIMESTAMP(3),
    "lastSavedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttemptAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockScore" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "listeningBand" DECIMAL(3,1),
    "readingBand" DECIMAL(3,1),
    "writingBand" DECIMAL(3,1),
    "speakingBand" DECIMAL(3,1),
    "overallBand" DECIMAL(3,1),
    "scoreSnapshot" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MockScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeResult" (
    "id" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "scoreSnapshot" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PracticeResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingSubmission" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "taskNumber" INTEGER NOT NULL,
    "responseText" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingEvaluation" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "source" "EvaluationSource" NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "evaluatorUserId" UUID,
    "taskResponseBand" DECIMAL(3,1),
    "coherenceBand" DECIMAL(3,1),
    "lexicalBand" DECIMAL(3,1),
    "grammarBand" DECIMAL(3,1),
    "overallBand" DECIMAL(3,1),
    "feedback" JSONB,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingSubmission" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "attemptId" UUID NOT NULL,
    "partNumber" INTEGER,
    "transcript" TEXT,
    "consentStatus" "RecordingConsentStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingEvaluation" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "source" "EvaluationSource" NOT NULL,
    "status" "EvaluationStatus" NOT NULL DEFAULT 'PENDING',
    "evaluatorUserId" UUID,
    "fluencyBand" DECIMAL(3,1),
    "lexicalBand" DECIMAL(3,1),
    "grammarBand" DECIMAL(3,1),
    "pronunciationBand" DECIMAL(3,1),
    "overallBand" DECIMAL(3,1),
    "transcriptHighlights" JSONB,
    "feedback" JSONB,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "evaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingRecording" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "durationSeconds" INTEGER,
    "fileSizeBytes" BIGINT,
    "consentStatus" "RecordingConsentStatus" NOT NULL,
    "recordedAt" TIMESTAMP(3),
    "deleteAfter" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpeakingRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpeakingSession" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "trainerUserId" UUID NOT NULL,
    "studentUserId" UUID NOT NULL,
    "status" "SpeakingSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpeakingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModel" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "version" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIPromptVersion" (
    "id" UUID NOT NULL,
    "promptKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "promptText" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIPromptVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIJob" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "jobType" "AIJobType" NOT NULL,
    "status" "AIJobStatus" NOT NULL DEFAULT 'QUEUED',
    "inputPayload" JSONB,
    "resultPayload" JSONB,
    "errorCode" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageLog" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "aiModelId" UUID NOT NULL,
    "promptVersionId" UUID,
    "jobType" "AIJobType" NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DECIMAL(12,6),
    "currency" VARCHAR(3) NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assignment" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "recipientSnapshotAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentContent" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "testVersionId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentBatchTarget" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignmentBatchTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentTarget" (
    "id" UUID NOT NULL,
    "assignmentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "source" "AssignmentTargetSource" NOT NULL,
    "sourceBatchId" UUID,
    "status" "AssignmentTargetStatus" NOT NULL DEFAULT 'ASSIGNED',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignmentCompletion" (
    "id" UUID NOT NULL,
    "assignmentTargetId" UUID NOT NULL,
    "attemptId" UUID,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "resultSnapshot" JSONB,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssignmentCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstituteReportSnapshot" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "generatedByUserId" UUID,
    "reportType" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "dataSnapshot" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstituteReportSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "type" "ConversationType" NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationParticipant" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "ConversationParticipantRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "lastReadAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "status" "MessageStatus" NOT NULL DEFAULT 'SENT',
    "clientMessageId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageAttachment" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "messageEmailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationDelivery" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "providerRef" TEXT,
    "lastErrorCode" TEXT,
    "nextAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "ownerId" UUID,
    "sourceId" UUID,
    "convertedUserId" UUID,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "interestedIn" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "nextFollowUpAt" TIMESTAMP(3),
    "targetBand" DOUBLE PRECISION,
    "examDate" TIMESTAMP(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadFollowUp" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "assignedToId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "notes" TEXT,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "LeadFollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "type" "LeadActivityType" NOT NULL,
    "subject" TEXT,
    "description" TEXT,
    "outcome" TEXT,
    "followUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadAssignment" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "assignedToId" UUID NOT NULL,
    "assignedById" UUID NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadStatusHistory" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "changedById" UUID NOT NULL,
    "previousStatus" "LeadStatus",
    "newStatus" "LeadStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadSource" (
    "id" UUID NOT NULL,
    "instituteId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadConsent" (
    "id" UUID NOT NULL,
    "leadId" UUID NOT NULL,
    "recordedById" UUID NOT NULL,
    "type" "LeadConsentType" NOT NULL,
    "status" "LeadConsentStatus" NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evidenceRef" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "instituteId" UUID,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" UUID NOT NULL,
    "instituteId" UUID,
    "userId" UUID,
    "type" "SecurityEventType" NOT NULL,
    "severity" "SecuritySeverity" NOT NULL DEFAULT 'INFO',
    "success" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataDeletionRequest" (
    "id" UUID NOT NULL,
    "targetType" "DeletionTargetType" NOT NULL,
    "targetId" UUID NOT NULL,
    "requestedByUserId" UUID,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "reasonCode" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "resultSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionJobRun" (
    "id" UUID NOT NULL,
    "jobType" "RetentionJobType" NOT NULL,
    "status" "RetentionJobStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "recordsScanned" INTEGER NOT NULL DEFAULT 0,
    "recordsDeleted" INTEGER NOT NULL DEFAULT 0,
    "recordsSkipped" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "summary" JSONB,
    "failureCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetentionJobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionHold" (
    "id" UUID NOT NULL,
    "scope" "RetentionHoldScope" NOT NULL,
    "dataCategory" TEXT,
    "targetId" UUID,
    "reasonCode" TEXT NOT NULL,
    "placedByUserId" UUID NOT NULL,
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "releasedByUserId" UUID,
    "releasedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionHold_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_isActive_createdAt_idx" ON "User"("isActive", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "AuthIdentity_userId_idx" ON "AuthIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthIdentity_provider_providerSubject_key" ON "AuthIdentity"("provider", "providerSubject");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_familyId_revokedAt_idx" ON "RefreshToken"("familyId", "revokedAt");

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "TwoFactorChallenge_userId_purpose_expiresAt_idx" ON "TwoFactorChallenge"("userId", "purpose", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Institute_slug_key" ON "Institute"("slug");

-- CreateIndex
CREATE INDEX "Institute_status_createdAt_idx" ON "Institute"("status", "createdAt");

-- CreateIndex
CREATE INDEX "InstituteMembership_userId_status_idx" ON "InstituteMembership"("userId", "status");

-- CreateIndex
CREATE INDEX "InstituteMembership_instituteId_role_status_idx" ON "InstituteMembership"("instituteId", "role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "InstituteMembership_instituteId_userId_key" ON "InstituteMembership"("instituteId", "userId");

-- CreateIndex
CREATE INDEX "MembershipInvitation_instituteId_status_createdAt_idx" ON "MembershipInvitation"("instituteId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MembershipInvitation_inviteeEmail_status_idx" ON "MembershipInvitation"("inviteeEmail", "status");

-- CreateIndex
CREATE INDEX "MembershipInvitation_invitedUserId_status_idx" ON "MembershipInvitation"("invitedUserId", "status");

-- CreateIndex
CREATE INDEX "Batch_instituteId_createdAt_idx" ON "Batch"("instituteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_instituteId_name_key" ON "Batch"("instituteId", "name");

-- CreateIndex
CREATE INDEX "BatchMember_userId_idx" ON "BatchMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchMember_batchId_userId_key" ON "BatchMember"("batchId", "userId");

-- CreateIndex
CREATE INDEX "TrainerStudent_instituteId_trainerUserId_status_idx" ON "TrainerStudent"("instituteId", "trainerUserId", "status");

-- CreateIndex
CREATE INDEX "TrainerStudent_instituteId_studentUserId_status_idx" ON "TrainerStudent"("instituteId", "studentUserId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TrainerStudent_instituteId_trainerUserId_studentUserId_key" ON "TrainerStudent"("instituteId", "trainerUserId", "studentUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_code_key" ON "Plan"("code");

-- CreateIndex
CREATE INDEX "Plan_ownerType_isActive_idx" ON "Plan"("ownerType", "isActive");

-- CreateIndex
CREATE INDEX "PlanVersion_planId_effectiveFrom_idx" ON "PlanVersion"("planId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "PlanVersion_planId_version_key" ON "PlanVersion"("planId", "version");

-- CreateIndex
CREATE INDEX "Subscription_userId_status_endsAt_idx" ON "Subscription"("userId", "status", "endsAt");

-- CreateIndex
CREATE INDEX "Subscription_instituteId_status_endsAt_idx" ON "Subscription"("instituteId", "status", "endsAt");

-- CreateIndex
CREATE INDEX "Subscription_planId_status_idx" ON "Subscription"("planId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerOrderId_key" ON "Payment"("providerOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerPaymentId_key" ON "Payment"("providerPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_status_createdAt_idx" ON "Payment"("subscriptionId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_providerEventId_key" ON "PaymentWebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_paymentId_createdAt_idx" ON "PaymentWebhookEvent"("paymentId", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_processedAt_createdAt_idx" ON "PaymentWebhookEvent"("processedAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_subscriptionId_issuedAt_idx" ON "Invoice"("subscriptionId", "issuedAt");

-- CreateIndex
CREATE INDEX "SubscriptionChange_subscriptionId_createdAt_idx" ON "SubscriptionChange"("subscriptionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRefund_providerRefundId_key" ON "PaymentRefund"("providerRefundId");

-- CreateIndex
CREATE INDEX "PaymentRefund_paymentId_status_idx" ON "PaymentRefund"("paymentId", "status");

-- CreateIndex
CREATE INDEX "UsageCounter_userId_idx" ON "UsageCounter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UsageCounter_userId_usageType_key" ON "UsageCounter"("userId", "usageType");

-- CreateIndex
CREATE INDEX "Book_isActive_bookNumber_idx" ON "Book"("isActive", "bookNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Book_title_category_key" ON "Book"("title", "category");

-- CreateIndex
CREATE INDEX "Test_category_status_idx" ON "Test"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Test_bookId_testNumber_category_key" ON "Test"("bookId", "testNumber", "category");

-- CreateIndex
CREATE INDEX "TestVersion_testId_status_idx" ON "TestVersion"("testId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TestVersion_testId_version_key" ON "TestVersion"("testId", "version");

-- CreateIndex
CREATE INDEX "TestModule_section_idx" ON "TestModule"("section");

-- CreateIndex
CREATE UNIQUE INDEX "TestModule_testVersionId_section_key" ON "TestModule"("testVersionId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "TestModule_testVersionId_position_key" ON "TestModule"("testVersionId", "position");

-- CreateIndex
CREATE INDEX "TestPart_testModuleId_idx" ON "TestPart"("testModuleId");

-- CreateIndex
CREATE UNIQUE INDEX "TestPart_testModuleId_position_key" ON "TestPart"("testModuleId", "position");

-- CreateIndex
CREATE INDEX "QuestionGroup_testPartId_idx" ON "QuestionGroup"("testPartId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionGroup_testPartId_position_key" ON "QuestionGroup"("testPartId", "position");

-- CreateIndex
CREATE INDEX "Question_testPartId_position_idx" ON "Question"("testPartId", "position");

-- CreateIndex
CREATE INDEX "Question_questionGroupId_idx" ON "Question"("questionGroupId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_testPartId_questionNumber_key" ON "Question"("testPartId", "questionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AnswerKey_questionId_key" ON "AnswerKey"("questionId");

-- CreateIndex
CREATE INDEX "BandConversionVersion_testVersionId_section_idx" ON "BandConversionVersion"("testVersionId", "section");

-- CreateIndex
CREATE UNIQUE INDEX "BandConversionVersion_testVersionId_section_version_key" ON "BandConversionVersion"("testVersionId", "section", "version");

-- CreateIndex
CREATE INDEX "Attempt_userId_status_createdAt_idx" ON "Attempt"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Attempt_testVersionId_status_idx" ON "Attempt"("testVersionId", "status");

-- CreateIndex
CREATE INDEX "Attempt_status_deadlineAt_idx" ON "Attempt"("status", "deadlineAt");

-- CreateIndex
CREATE INDEX "AttemptAnswer_attemptId_lastSavedAt_idx" ON "AttemptAnswer"("attemptId", "lastSavedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptAnswer_attemptId_questionId_key" ON "AttemptAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "MockScore_attemptId_key" ON "MockScore"("attemptId");

-- CreateIndex
CREATE INDEX "MockScore_userId_completedAt_idx" ON "MockScore"("userId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PracticeResult_attemptId_key" ON "PracticeResult"("attemptId");

-- CreateIndex
CREATE INDEX "PracticeResult_userId_completedAt_idx" ON "PracticeResult"("userId", "completedAt");

-- CreateIndex
CREATE INDEX "WritingSubmission_userId_submittedAt_idx" ON "WritingSubmission"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "WritingSubmission_attemptId_taskNumber_idx" ON "WritingSubmission"("attemptId", "taskNumber");

-- CreateIndex
CREATE INDEX "WritingEvaluation_submissionId_source_createdAt_idx" ON "WritingEvaluation"("submissionId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "WritingEvaluation_evaluatorUserId_createdAt_idx" ON "WritingEvaluation"("evaluatorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SpeakingSubmission_userId_submittedAt_idx" ON "SpeakingSubmission"("userId", "submittedAt");

-- CreateIndex
CREATE INDEX "SpeakingSubmission_attemptId_partNumber_idx" ON "SpeakingSubmission"("attemptId", "partNumber");

-- CreateIndex
CREATE INDEX "SpeakingEvaluation_submissionId_source_createdAt_idx" ON "SpeakingEvaluation"("submissionId", "source", "createdAt");

-- CreateIndex
CREATE INDEX "SpeakingEvaluation_evaluatorUserId_createdAt_idx" ON "SpeakingEvaluation"("evaluatorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "SpeakingRecording_submissionId_createdAt_idx" ON "SpeakingRecording"("submissionId", "createdAt");

-- CreateIndex
CREATE INDEX "SpeakingRecording_deleteAfter_deletedAt_idx" ON "SpeakingRecording"("deleteAfter", "deletedAt");

-- CreateIndex
CREATE INDEX "SpeakingSession_instituteId_scheduledStart_status_idx" ON "SpeakingSession"("instituteId", "scheduledStart", "status");

-- CreateIndex
CREATE INDEX "SpeakingSession_trainerUserId_scheduledStart_idx" ON "SpeakingSession"("trainerUserId", "scheduledStart");

-- CreateIndex
CREATE INDEX "SpeakingSession_studentUserId_scheduledStart_idx" ON "SpeakingSession"("studentUserId", "scheduledStart");

-- CreateIndex
CREATE INDEX "AIModel_isActive_provider_idx" ON "AIModel"("isActive", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "AIModel_provider_modelName_version_key" ON "AIModel"("provider", "modelName", "version");

-- CreateIndex
CREATE INDEX "AIPromptVersion_promptKey_isActive_idx" ON "AIPromptVersion"("promptKey", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AIPromptVersion_promptKey_version_key" ON "AIPromptVersion"("promptKey", "version");

-- CreateIndex
CREATE INDEX "AIJob_status_createdAt_idx" ON "AIJob"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AIJob_userId_createdAt_idx" ON "AIJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AIJob_jobType_status_idx" ON "AIJob"("jobType", "status");

-- CreateIndex
CREATE INDEX "AIUsageLog_userId_createdAt_idx" ON "AIUsageLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsageLog_aiModelId_createdAt_idx" ON "AIUsageLog"("aiModelId", "createdAt");

-- CreateIndex
CREATE INDEX "AIUsageLog_jobType_createdAt_idx" ON "AIUsageLog"("jobType", "createdAt");

-- CreateIndex
CREATE INDEX "Assignment_instituteId_status_createdAt_idx" ON "Assignment"("instituteId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Assignment_createdByUserId_createdAt_idx" ON "Assignment"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Assignment_instituteId_dueAt_idx" ON "Assignment"("instituteId", "dueAt");

-- CreateIndex
CREATE INDEX "AssignmentContent_testVersionId_idx" ON "AssignmentContent"("testVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentContent_assignmentId_position_key" ON "AssignmentContent"("assignmentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentContent_assignmentId_testVersionId_key" ON "AssignmentContent"("assignmentId", "testVersionId");

-- CreateIndex
CREATE INDEX "AssignmentBatchTarget_batchId_idx" ON "AssignmentBatchTarget"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentBatchTarget_assignmentId_batchId_key" ON "AssignmentBatchTarget"("assignmentId", "batchId");

-- CreateIndex
CREATE INDEX "AssignmentTarget_userId_status_assignedAt_idx" ON "AssignmentTarget"("userId", "status", "assignedAt");

-- CreateIndex
CREATE INDEX "AssignmentTarget_assignmentId_status_idx" ON "AssignmentTarget"("assignmentId", "status");

-- CreateIndex
CREATE INDEX "AssignmentTarget_sourceBatchId_idx" ON "AssignmentTarget"("sourceBatchId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentTarget_assignmentId_userId_key" ON "AssignmentTarget"("assignmentId", "userId");

-- CreateIndex
CREATE INDEX "AssignmentCompletion_assignmentTargetId_completedAt_idx" ON "AssignmentCompletion"("assignmentTargetId", "completedAt");

-- CreateIndex
CREATE INDEX "AssignmentCompletion_attemptId_idx" ON "AssignmentCompletion"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignmentCompletion_assignmentTargetId_attemptId_key" ON "AssignmentCompletion"("assignmentTargetId", "attemptId");

-- CreateIndex
CREATE INDEX "InstituteReportSnapshot_instituteId_reportType_generatedAt_idx" ON "InstituteReportSnapshot"("instituteId", "reportType", "generatedAt");

-- CreateIndex
CREATE INDEX "InstituteReportSnapshot_generatedByUserId_generatedAt_idx" ON "InstituteReportSnapshot"("generatedByUserId", "generatedAt");

-- CreateIndex
CREATE INDEX "Conversation_instituteId_status_updatedAt_idx" ON "Conversation"("instituteId", "status", "updatedAt");

-- CreateIndex
CREATE INDEX "ConversationParticipant_userId_leftAt_idx" ON "ConversationParticipant"("userId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "ConversationParticipant_conversationId_userId_key" ON "ConversationParticipant"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_id_idx" ON "Message"("conversationId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Message_senderId_clientMessageId_key" ON "Message"("senderId", "clientMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageAttachment_storageKey_key" ON "MessageAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "MessageAttachment_messageId_idx" ON "MessageAttachment"("messageId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx" ON "NotificationDelivery"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "NotificationDelivery_notificationId_channel_idx" ON "NotificationDelivery"("notificationId", "channel");

-- CreateIndex
CREATE INDEX "Lead_instituteId_status_createdAt_idx" ON "Lead"("instituteId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_instituteId_ownerId_status_idx" ON "Lead"("instituteId", "ownerId", "status");

-- CreateIndex
CREATE INDEX "Lead_instituteId_nextFollowUpAt_idx" ON "Lead"("instituteId", "nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Lead_instituteId_email_idx" ON "Lead"("instituteId", "email");

-- CreateIndex
CREATE INDEX "Lead_instituteId_phone_idx" ON "Lead"("instituteId", "phone");

-- CreateIndex
CREATE INDEX "Lead_instituteId_deletedAt_idx" ON "Lead"("instituteId", "deletedAt");

-- CreateIndex
CREATE INDEX "Lead_convertedUserId_idx" ON "Lead"("convertedUserId");

-- CreateIndex
CREATE INDEX "LeadFollowUp_leadId_status_dueAt_idx" ON "LeadFollowUp"("leadId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "LeadFollowUp_assignedToId_status_dueAt_idx" ON "LeadFollowUp"("assignedToId", "status", "dueAt");

-- CreateIndex
CREATE INDEX "LeadFollowUp_createdById_createdAt_idx" ON "LeadFollowUp"("createdById", "createdAt");

-- CreateIndex
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadActivity_actorId_createdAt_idx" ON "LeadActivity"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadActivity_followUpAt_idx" ON "LeadActivity"("followUpAt");

-- CreateIndex
CREATE INDEX "LeadAssignment_leadId_assignedAt_idx" ON "LeadAssignment"("leadId", "assignedAt");

-- CreateIndex
CREATE INDEX "LeadAssignment_assignedToId_endedAt_idx" ON "LeadAssignment"("assignedToId", "endedAt");

-- CreateIndex
CREATE INDEX "LeadStatusHistory_leadId_createdAt_idx" ON "LeadStatusHistory"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "LeadStatusHistory_changedById_createdAt_idx" ON "LeadStatusHistory"("changedById", "createdAt");

-- CreateIndex
CREATE INDEX "LeadSource_instituteId_isActive_idx" ON "LeadSource"("instituteId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "LeadSource_instituteId_name_key" ON "LeadSource"("instituteId", "name");

-- CreateIndex
CREATE INDEX "LeadConsent_leadId_type_capturedAt_idx" ON "LeadConsent"("leadId", "type", "capturedAt");

-- CreateIndex
CREATE INDEX "LeadConsent_recordedById_createdAt_idx" ON "LeadConsent"("recordedById", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_instituteId_createdAt_idx" ON "AuditLog"("instituteId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_createdAt_idx" ON "AuditLog"("resourceType", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE INDEX "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_instituteId_createdAt_idx" ON "SecurityEvent"("instituteId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_type_createdAt_idx" ON "SecurityEvent"("type", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_createdAt_idx" ON "SecurityEvent"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_ipAddress_createdAt_idx" ON "SecurityEvent"("ipAddress", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_requestId_idx" ON "SecurityEvent"("requestId");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_targetType_targetId_createdAt_idx" ON "DataDeletionRequest"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_status_scheduledFor_idx" ON "DataDeletionRequest"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "DataDeletionRequest_requestedByUserId_createdAt_idx" ON "DataDeletionRequest"("requestedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "RetentionJobRun_jobType_startedAt_idx" ON "RetentionJobRun"("jobType", "startedAt");

-- CreateIndex
CREATE INDEX "RetentionJobRun_status_startedAt_idx" ON "RetentionJobRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "RetentionHold_scope_targetId_isActive_idx" ON "RetentionHold"("scope", "targetId", "isActive");

-- CreateIndex
CREATE INDEX "RetentionHold_dataCategory_isActive_idx" ON "RetentionHold"("dataCategory", "isActive");

-- CreateIndex
CREATE INDEX "RetentionHold_isActive_expiresAt_idx" ON "RetentionHold"("isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "RetentionHold_placedByUserId_placedAt_idx" ON "RetentionHold"("placedByUserId", "placedAt");

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthIdentity" ADD CONSTRAINT "AuthIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorChallenge" ADD CONSTRAINT "TwoFactorChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Institute" ADD CONSTRAINT "Institute_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteMembership" ADD CONSTRAINT "InstituteMembership_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteMembership" ADD CONSTRAINT "InstituteMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipInvitation" ADD CONSTRAINT "MembershipInvitation_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Batch" ADD CONSTRAINT "Batch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMember" ADD CONSTRAINT "BatchMember_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchMember" ADD CONSTRAINT "BatchMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerStudent" ADD CONSTRAINT "TrainerStudent_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerStudent" ADD CONSTRAINT "TrainerStudent_trainerUserId_fkey" FOREIGN KEY ("trainerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerStudent" ADD CONSTRAINT "TrainerStudent_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainerStudent" ADD CONSTRAINT "TrainerStudent_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanVersion" ADD CONSTRAINT "PlanVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planVersionId_fkey" FOREIGN KEY ("planVersionId") REFERENCES "PlanVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionChange" ADD CONSTRAINT "SubscriptionChange_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Test" ADD CONSTRAINT "Test_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestVersion" ADD CONSTRAINT "TestVersion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "Test"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestModule" ADD CONSTRAINT "TestModule_testVersionId_fkey" FOREIGN KEY ("testVersionId") REFERENCES "TestVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestPart" ADD CONSTRAINT "TestPart_testModuleId_fkey" FOREIGN KEY ("testModuleId") REFERENCES "TestModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionGroup" ADD CONSTRAINT "QuestionGroup_testPartId_fkey" FOREIGN KEY ("testPartId") REFERENCES "TestPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_testPartId_fkey" FOREIGN KEY ("testPartId") REFERENCES "TestPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_questionGroupId_fkey" FOREIGN KEY ("questionGroupId") REFERENCES "QuestionGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnswerKey" ADD CONSTRAINT "AnswerKey_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BandConversionVersion" ADD CONSTRAINT "BandConversionVersion_testVersionId_fkey" FOREIGN KEY ("testVersionId") REFERENCES "TestVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attempt" ADD CONSTRAINT "Attempt_testVersionId_fkey" FOREIGN KEY ("testVersionId") REFERENCES "TestVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptAnswer" ADD CONSTRAINT "AttemptAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockScore" ADD CONSTRAINT "MockScore_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockScore" ADD CONSTRAINT "MockScore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeResult" ADD CONSTRAINT "PracticeResult_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeResult" ADD CONSTRAINT "PracticeResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingSubmission" ADD CONSTRAINT "WritingSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingSubmission" ADD CONSTRAINT "WritingSubmission_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingEvaluation" ADD CONSTRAINT "WritingEvaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "WritingSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingEvaluation" ADD CONSTRAINT "WritingEvaluation_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingSubmission" ADD CONSTRAINT "SpeakingSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingSubmission" ADD CONSTRAINT "SpeakingSubmission_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingEvaluation" ADD CONSTRAINT "SpeakingEvaluation_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SpeakingSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingEvaluation" ADD CONSTRAINT "SpeakingEvaluation_evaluatorUserId_fkey" FOREIGN KEY ("evaluatorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingRecording" ADD CONSTRAINT "SpeakingRecording_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "SpeakingSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingSession" ADD CONSTRAINT "SpeakingSession_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingSession" ADD CONSTRAINT "SpeakingSession_trainerUserId_fkey" FOREIGN KEY ("trainerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpeakingSession" ADD CONSTRAINT "SpeakingSession_studentUserId_fkey" FOREIGN KEY ("studentUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIJob" ADD CONSTRAINT "AIJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIUsageLog" ADD CONSTRAINT "AIUsageLog_aiModelId_fkey" FOREIGN KEY ("aiModelId") REFERENCES "AIModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentContent" ADD CONSTRAINT "AssignmentContent_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentContent" ADD CONSTRAINT "AssignmentContent_testVersionId_fkey" FOREIGN KEY ("testVersionId") REFERENCES "TestVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentBatchTarget" ADD CONSTRAINT "AssignmentBatchTarget_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentBatchTarget" ADD CONSTRAINT "AssignmentBatchTarget_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentTarget" ADD CONSTRAINT "AssignmentTarget_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentTarget" ADD CONSTRAINT "AssignmentTarget_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentCompletion" ADD CONSTRAINT "AssignmentCompletion_assignmentTargetId_fkey" FOREIGN KEY ("assignmentTargetId") REFERENCES "AssignmentTarget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentCompletion" ADD CONSTRAINT "AssignmentCompletion_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "Attempt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteReportSnapshot" ADD CONSTRAINT "InstituteReportSnapshot_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstituteReportSnapshot" ADD CONSTRAINT "InstituteReportSnapshot_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageAttachment" ADD CONSTRAINT "MessageAttachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_convertedUserId_fkey" FOREIGN KEY ("convertedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "LeadSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFollowUp" ADD CONSTRAINT "LeadFollowUp_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFollowUp" ADD CONSTRAINT "LeadFollowUp_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadFollowUp" ADD CONSTRAINT "LeadFollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadActivity" ADD CONSTRAINT "LeadActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadAssignment" ADD CONSTRAINT "LeadAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadStatusHistory" ADD CONSTRAINT "LeadStatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadSource" ADD CONSTRAINT "LeadSource_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadConsent" ADD CONSTRAINT "LeadConsent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadConsent" ADD CONSTRAINT "LeadConsent_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_instituteId_fkey" FOREIGN KEY ("instituteId") REFERENCES "Institute"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
