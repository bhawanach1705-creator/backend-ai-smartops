export function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = err.statusCode || 500;
  let message = err.message || "Internal Server Error";
  let details = err.details;

  if (err.name === "ValidationError") {
    status = 400;
    message = "Validation failed";
    details = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    message = "Duplicate value";
  }

  if (status >= 500) console.error("[error]", err);
  res.status(status).json({
    success: false,
    message,
    ...(details && { details }),
    ...(process.env.NODE_ENV === "development" && status >= 500 && { stack: err.stack }),
  });
}
