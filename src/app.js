
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const env = require("./config/env");
const authRoutes = require("./modules/auth/routes/auth.routes");
const { apiLimiter } = require("./middleware/rate-limit.middleware");
const {
  notFoundHandler,
  errorHandler,
} = require("./middleware/error.middleware");

const userRoutes = require("./modules/users/routes/user.routes");
const organizationRoutes = require("./modules/organizations/routes/organization.routes");
const membershipRoutes = require("./modules/memberships/routes/membership.routes");
const docsRoutes = require("./routes/docs.routes");

const crmRoutes = require("./modules/crm/routes/crm.routes");
const cmsRoutes = require("./modules/cms/routes/cms.routes");
const attemptRoutes = require("./modules/attempts/routes/attempt.routes");
const mockRoutes = require("./modules/mock/routes/mock.routes");
const practiceRoutes = require("./modules/practice/routes/practice.routes");
const resultRoutes = require("./modules/results/routes/result.routes");

// Existing marketing module
const marketingRoutes = require("./modules/marketing/routes/marketing.routes");

// New billing and payment modules
const paymentRoutes = require("./modules/payments/routes/payment.routes");
const paymentController = require("./modules/payments/controllers/payment.controller");
const subscriptionRoutes = require("./modules/subscriptions/routes/subscription.routes");
const planRoutes = require("./modules/plans/routes/plan.routes");
const invoiceRoutes = require("./modules/invoices/routes/invoice.routes");

const app = express();

app.disable("x-powered-by");
app.use(helmet());

const allowedOrigins = env.FRONTEND_URL
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  })
);

// General API rate limiting
app.use("/api", apiLimiter);

// Razorpay webhook - raw body required for signature verification
app.post(
  "/api/v1/payments/webhook",
  express.raw({
    type: "application/json",
    limit: "100kb",
  }),
  paymentController.handleWebhook
);

// Request body parsing
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(cookieParser());

// API routes
app.use("/api/v1/docs", docsRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/organizations", organizationRoutes);
app.use("/api/v1/institutes", membershipRoutes);

app.use("/api/v1/institutes/:instituteId/crm", crmRoutes);
app.use("/api/v1/cms", cmsRoutes);

app.use("/api/v1/attempts", attemptRoutes);
app.use("/api/v1/mock", mockRoutes);
app.use("/api/v1/practice", practiceRoutes);
app.use("/api/v1/results", resultRoutes);

// Existing marketing routes
app.use("/api/v1/marketing", marketingRoutes);

// New payment and billing routes
app.use("/api/v1/payments", paymentRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/plans", planRoutes);
app.use("/api/v1/invoices", invoiceRoutes);

// Health check
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Equilx IELTS API is running",
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
