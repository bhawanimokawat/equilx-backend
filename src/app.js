const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const env = require("./config/env");
const authRoutes = require("./modules/auth/routes/auth.routes");
const { apiLimiter,} = require("./middleware/rate-limit.middleware");
const {  notFoundHandler,  errorHandler,} = require("./middleware/error.middleware");
const userRoutes = require("./modules/users/routes/user.routes");
const organizationRoutes = require("./modules/organizations/routes/organization.routes");
const membershipRoutes = require("./modules/memberships/routes/membership.routes")
const docsRoutes = require("./routes/docs.routes");
const crmRoutes = require("./modules/crm/routes/crm.routes");
const { services } = require("nodemailer/lib/well-known/services.js");
const cmsRoutes = require("./modules/cms/routes/cms.routes");
const attemptRoutes = require("./modules/attempts/routes/attempt.routes");
const mockRoutes = require("./modules/mock/routes/mock.routes");
const practiceRoutes = require("./modules/practice/routes/practice.routes");
const resultRoutes = require("./modules/results/routes/result.routes");


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

// Apply general API rate limiting once.
app.use("/api", apiLimiter);

// Parse requests before mounting routes.
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "20kb" }));
app.use(cookieParser());

// API routes.
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



// Health check.
app.get("/api/v1/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Equilx IELTS API is running",
  });
});

// Handle unknown routes and errors last.
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;









