function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const error = new Error("Request validation failed.");

      error.statusCode = 400;
      error.code = "VALIDATION_ERROR";
      error.details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));

      return next(error);
    }

    // Store validated and transformed request data.
    req.validated = result.data;

    next();
  };
}

module.exports = { validate };
