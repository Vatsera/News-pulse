/**
 * utils/asyncHandler.js
 * Wraps an async route handler so that if it throws (or its promise
 * rejects), the error is passed to next(err) instead of crashing the
 * process or hanging the request. Keeps controllers free of repetitive
 * try/catch blocks.
 */

function asyncHandler(handler) {
  return function wrapped(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = asyncHandler;
