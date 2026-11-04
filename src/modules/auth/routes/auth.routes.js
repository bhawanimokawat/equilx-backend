const express = require("express");
const { register, verifyEmail, resendOtp, login, refresh, logout, forgotPassword, resetPassword, changePassword, me,} = require("../controllers/auth.controller");

const { requireAuth } = require("../../../middleware/auth.middleware");
const {
  authLimiter,
  otpLimiter,
  passwordResetLimiter,
} = require("../../../middleware/rate-limit.middleware");
const router = express.Router();

router.post("/register", authLimiter, register);
router.post("/verify-email", otpLimiter, verifyEmail);
router.post("/resend-otp", otpLimiter, resendOtp);
router.post("/login", authLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.post("/forgot-password", passwordResetLimiter, forgotPassword);
router.post("/reset-password", passwordResetLimiter, resetPassword);
router.patch("/change-password", requireAuth, changePassword);
router.get("/me", requireAuth, me);

module.exports = router;
