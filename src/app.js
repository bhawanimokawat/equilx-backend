
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const env = require("./config/env");

// ========================================
// AUTH & USER MODULES
// ========================================

const authRoutes = require("./modules/auth/routes/auth.routes");
const userRoutes = require("./modules/users/routes/user.routes");
const organizationRoutes = require("./modules/organizations/routes/organization.routes");
const membershipRoutes = require("./modules/memberships/routes/membership.routes");
const studentInvitationAcceptanceRoutes = require("./modules/memberships/routes/student-invitation-acceptance.routes");

// ========================================
// DOCUMENTATION
// ========================================

const docsRoutes = require("./routes/docs.routes");

// ========================================
// CRM, CMS & IELTS MODULES
// ========================================

const crmRoutes = require("./modules/crm/routes/crm.routes");
const cmsRoutes = require("./modules/cms/routes/cms.routes");

const attemptRoutes = require("./modules/attempts/routes/attempt.routes");
const mockRoutes = require("./modules/mock/routes/mock.routes");
const practiceRoutes = require("./modules/practice/routes/practice.routes");
const resultRoutes = require("./modules/results/routes/result.routes");

// ========================================
// MARKETING
// ========================================

const marketingRoutes = require("./modules/marketing/routes/marketing.routes");

// ========================================
// PAYMENTS & SUBSCRIPTIONS
// ========================================

const paymentRoutes = require("./modules/payments/routes/payment.routes");
const paymentController = require("./modules/payments/controllers/payment.controller");

const subscriptionRoutes = require("./modules/subscriptions/routes/subscription.routes");
const planRoutes = require("./modules/plans/routes/plan.routes");
const invoiceRoutes = require("./modules/invoices/routes/invoice.routes");

// ========================================
// INSTITUTE MODULES
// ========================================

const assignmentRoutes = require("./modules/assignments/routes/assignment.routes");
const batchRoutes = require("./modules/batches/routes/batch.routes");
const chatRoutes = require("./modules/chat/routes/chat.routes");

// ========================================
// EQUILX SUPPORT CHAT
// ========================================

const supportChatRoutes = require("./modules/support-chat/routes/support-chat.routes");

// ========================================
// LEARNING MODULES
// ========================================

const writingRoutes = require("./modules/writing/routes/writing.routes");
const speakingRoutes = require("./modules/speaking/routes/speaking.routes");
const materialRoutes = require("./modules/materials/routes/material.routes");

// ========================================
// MIDDLEWARE
// ========================================

const {
  apiLimiter,
} = require("./middleware/rate-limit.middleware");

const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/error.middleware");

// ========================================
// EXPRESS APP
// ========================================

const app = express();

app.disable("x-powered-by");

// ========================================
// SECURITY
// ========================================

app.use(helmet());

// ========================================
// CORS CONFIGURATION
// ========================================

const allowedOrigins = env.FRONTEND_URL
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error("Origin not allowed by CORS")
      );
    },

    credentials: true,
  })
);

// ========================================
// GENERAL API RATE LIMITING
// ========================================

app.use("/api", apiLimiter);

// ========================================
// RAZORPAY WEBHOOK
// Raw body required for signature verification
// ========================================

app.post(
  "/api/v1/payments/webhook",
  express.raw({
    type: "application/json",
    limit: "100kb",
  }),
  paymentController.handleWebhook
);

// ========================================
// REQUEST BODY PARSING
// ========================================

app.use(
  express.json({
    limit: "100kb",
  })
);

app.use(
  express.urlencoded({
    extended: false,
    limit: "20kb",
  })
);

app.use(cookieParser());

// ========================================
// HEALTH CHECK
// ========================================

app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Equilx IELTS API is running",
  });
});

// ========================================
// API ROUTES
// ========================================

// Documentation
app.use("/api/v1/docs", docsRoutes);

// Authentication
app.use("/api/v1/auth", authRoutes);

// Users
app.use("/api/v1/users", userRoutes);

// Organizations
app.use("/api/v1/organizations", organizationRoutes);

// Institute memberships
app.use("/api/v1/institutes", membershipRoutes);

// Student invitations
app.use(
  "/api/v1/student-invitations",
  studentInvitationAcceptanceRoutes
);

// ========================================
// CRM & CMS
// ========================================

app.use(
  "/api/v1/institutes/:instituteId/crm",
  crmRoutes
);

app.use("/api/v1/cms", cmsRoutes);

// ========================================
// IELTS ATTEMPTS, MOCKS & PRACTICE
// ========================================

app.use("/api/v1/attempts", attemptRoutes);
app.use("/api/v1/mock", mockRoutes);
app.use("/api/v1/practice", practiceRoutes);
app.use("/api/v1/results", resultRoutes);

// ========================================
// MARKETING
// ========================================

app.use("/api/v1/marketing", marketingRoutes);

// ========================================
// PAYMENTS, PLANS & SUBSCRIPTIONS
// ========================================

app.use("/api/v1/payments", paymentRoutes);

app.use(
  "/api/v1/subscriptions",
  subscriptionRoutes
);

app.use("/api/v1/plans", planRoutes);

app.use("/api/v1/invoices", invoiceRoutes);

// ========================================
// EQUILX SUPPORT CHAT
//
// IMPORTANT:
// Register the specific Support Chat router
// before generic /api/v1 institute routers.
//
// Individual Student:
// /api/v1/support-chat/conversations
//
// Institute Student:
// /api/v1/:instituteId/conversations
// ========================================

app.use(
  "/api/v1/support-chat",
  supportChatRoutes
);

// ========================================
// GENERIC INSTITUTE ROUTES
// ========================================

app.use("/api/v1", assignmentRoutes);

app.use("/api/v1", batchRoutes);

app.use("/api/v1", chatRoutes);

// ========================================
// WRITING, SPEAKING & MATERIALS
// ========================================

app.use("/api/v1/writing", writingRoutes);

app.use("/api/v1/speaking", speakingRoutes);

app.use("/api/v1/materials", materialRoutes);

// ========================================
// 404 HANDLER
// ========================================

app.use(notFoundHandler);

// ========================================
// GLOBAL ERROR HANDLER
// ========================================

app.use(errorHandler);

// ========================================
// EXPORT
// ========================================

module.exports = app;
