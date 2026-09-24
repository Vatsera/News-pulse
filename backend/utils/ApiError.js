/**
 * utils/ApiError.js
 * A small custom error class so route/service code can say exactly what
 * HTTP status a failure should produce, e.g. `throw new ApiError(404, "...")`.
 * The central error handler (middleware/errorHandler.js) knows how to read it.
 */

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

module.exports = ApiError;
