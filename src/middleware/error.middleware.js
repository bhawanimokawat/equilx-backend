function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "The requested resource was not found.",
    },
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    Number.isInteger(err.statusCode) &&
    err.statusCode >= 400 &&
    err.statusCode <= 599
      ? err.statusCode
      : 500;

  // Log the actual error during development.
  if (process.env.NODE_ENV !== "production") {
    console.error("[ERROR MIDDLEWARE]", {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      message: err.message,
      stack: err.stack,
    });
  } else if (statusCode >= 500) {
    req.log?.error({ err }, "Request failed");
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code:
        statusCode >= 500
          ? "INTERNAL_SERVER_ERROR"
          : err.code || "REQUEST_ERROR",
      message:
        statusCode >= 500
          ? "An unexpected server error occurred."
          : err.message || "The request could not be processed.",
    },
  });
}

module.exports = { notFoundHandler, errorHandler,
};
