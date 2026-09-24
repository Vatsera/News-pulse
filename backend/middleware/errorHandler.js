/**
 * middleware/errorHandler.js
 * Responsibility: the single place that turns any error (ApiError or
 * otherwise) into a consistent JSON response. Every route handler is
 * wrapped with asyncHandler, so thrown errors always end up here instead
 * of crashing the server or hanging the request.
 */

const ApiError = require("../utils/ApiError");

function notFound(req, res) {
  res.status(404).json({
    error: { message: `Route not found: ${req.method} ${req.originalUrl}` },
  });
}

// Express recognizes error-handling middleware by its 4 arguments --
// this signature must stay (err, req, res, next) even though `next`
// is unused.
function errorHandler(err, req, res, next) {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;

  // Don't leak internal error details (stack traces, DB messages) for
  // unexpected 500s in production -- log them server-side instead.
  const isServerError = statusCode >= 500;
  if (isServerError) {
    console.error("[error]", err);
  }

  const message =
    isServerError && process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message;

  res.status(statusCode).json({ error: { message } });
}

module.exports = { notFound, errorHandler };
