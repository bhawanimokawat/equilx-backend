function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Please log in to continue.",
      },
    });
  }

  if (req.user.platformRole !== "SUPER_ADMIN") {
    return res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      },
    });
  }

  return next();
}

module.exports = { requireSuperAdmin };
