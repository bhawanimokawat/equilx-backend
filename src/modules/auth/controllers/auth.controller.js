const bcrypt = require("bcryptjs");

const { registerSchema, verifyEmailSchema, resendOtpSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } = require("../validation/auth.validation");
const { registerUser } = require("../services/email-verification.service");
const authService = require("../services/auths.service");

const { REFRESH_COOKIE_NAME, setRefreshCookie, clearRefreshCookie,} = require("../services/token.service");
const { verifyLoginOtpSchema } = require("../validation/two-factor.validation");
const { verifyLoginChallenge } = require("../services/two-factor.service");
const { createAuthenticatedSession } = require("../services/session.service");
const { googleLoginSchema } = require("../validation/google-auth.validation");
const { authenticateWithGoogle } = require("../services/google-auth.service");
const { requiresLoginTwoFactor, createLoginChallenge } = require("../services/two-factor.service");
 

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
    const passwordHash = await bcrypt.hash(password, 12);

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
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.issues,
      });
    }

    const result = await authService.login(parsed.data);

    // Staff login: OTP verification is required.
    if (result.twoFactorRequired) {
      return res.status(202).json({
        success: true,
        message: result.message,
        data: {
          twoFactorRequired: true,
          challengeId: result.challengeId,
          expiresIn: result.expiresIn,
        },
      });
    }

    // Normal login: session created successfully.
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



async function verifyLoginOtp(req, res, next) {
  try {
    const parsed = verifyLoginOtpSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.issues,
      });
    }

    const { challengeId, otp } = parsed.data;

    // Verify and consume the OTP challenge.
    const result = await verifyLoginChallenge({
      challengeId,
      otp,
    });

    // Create the authenticated session only after OTP verification.
    const session = await createAuthenticatedSession(result.user);

    setRefreshCookie(res, session.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Login verification successful.",
      data: {
        accessToken: session.accessToken,
        tokenType: "Bearer",
        expiresIn: 900,
        user: session.user,
      },
    });
  } catch (error) {
    next(error);
  }
}


async function googleLogin(req, res, next) {
  try {
    const parsed = googleLoginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed.",
        errors: parsed.error.issues,
      });
    }

    const { user, isNewUser } = await authenticateWithGoogle(
      parsed.data.idToken
    );

    // Mandatory OTP for staff accounts.
    if (requiresLoginTwoFactor(user)) {
      const challenge = await createLoginChallenge(user);

      return res.status(202).json({
        success: true,
        message: challenge.message,
        data: {
          twoFactorRequired: true,
          challengeId: challenge.challengeId,
          expiresIn: challenge.expiresIn,
          isNewUser,
        },
      });
    }

    // Create session only when 2FA is not required.
    const session = await createAuthenticatedSession(user);

    setRefreshCookie(res, session.refreshToken);

    return res.status(200).json({
      success: true,
      message: "Google login successful.",
      data: {
        accessToken: session.accessToken,
        tokenType: "Bearer",
        expiresIn: 900,
        user: session.user,
        isNewUser,
      },
    });
  } catch (error) {
    next(error);
  }
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
  verifyLoginOtp,
  googleLogin,
};
