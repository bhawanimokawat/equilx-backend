const bcrypt = require("bcryptjs");

const { registerSchema, verifyEmailSchema, resendOtpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } = require("../validation/auth.validation");
const { registerUser } = require("../services/email-verification.service");
const authService = require("../services/auth.service");

const { REFRESH_COOKIE_NAME, setRefreshCookie, clearRefreshCookie,} = require("../services/token.service");

async function register(req, res, next) {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Please check your registration details.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { name, email, password } = validation.data;
    const passwordHash = await bcrypt.hash(password, 8);

    const user = await registerUser({ name, email, passwordHash });

    return res.status(201).json({
      success: true,
      message: "Account created. Check your email for the verification code.",
      data: { user, verificationRequired: true },
    });
  } catch (error) {
    next(error);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const validation = verifyEmailSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Please provide a valid email and six-digit OTP.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    await authService.verifyEmail(validation.data);

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
      data: { emailVerified: true },
    });
  } catch (error) {
    next(error);
  }
}

async function resendOtp(req, res, next) {
  try {
    const validation = resendOtpSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Please provide a valid email address.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    await authService.resendVerificationOtp(validation.data.email);

    return res.status(200).json({
      success: true,
      message: "If the account requires verification, a code will be sent.",
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Please check your login details.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const result = await authService.login(validation.data);

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        accessToken: result.accessToken,
        tokenType: "Bearer",
        expiresIn: 900,
        user: result.user,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    const result = await authService.refreshSession(rawRefreshToken);

    setRefreshCookie(res, result.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Access token refreshed.",
      data: {
        accessToken: result.accessToken,
        tokenType: "Bearer",
        expiresIn: 900,
        user: result.user,
      },
    });
  } catch (error) {
    clearRefreshCookie(res);
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    await authService.logout(rawRefreshToken);
    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      message: "Logout successful.",
    });
  } catch (error) {
    next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const validation = forgotPasswordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Please provide a valid email address.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const result = await authService.requestPasswordReset(validation.data.email);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const validation = resetPasswordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Please check your password-reset details.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    await authService.resetPassword(validation.data);

    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. Please log in again.",
    });
  } catch (error) {
    next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const validation = changePasswordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        code: "VALIDATION_ERROR",
        message: "Please check your password details.",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    await authService.changePassword({
      userId: req.user.id,
      ...validation.data,
    });

    clearRefreshCookie(res);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully. Please log in again.",
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  const {
    id,
    email,
    platformRole,
    emailVerifiedAt,
    createdAt,
    profile,
  } = req.user;

  return res.status(200).json({
    success: true,
    data: {
      user: {
        id,
        email,
        platformRole,
        emailVerified: Boolean(emailVerifiedAt),
        createdAt,
        profile,
      },
    },
  });
}

module.exports = {
  register,
  verifyEmail,
  resendOtp,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  changePassword,
  me,
};
