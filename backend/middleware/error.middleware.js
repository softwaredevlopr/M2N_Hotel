const { sendError, sendNotFound } = require("../utils/apiResponse");

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function notFoundHandler(req, res) {
  return sendNotFound(res, `Route not found: ${req.method} ${req.originalUrl}`);
}

function errorHandler(err, _req, res, _next) {
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && !err.isOperational
      ? "Internal server error"
      : err.message || "Internal server error";

  if (statusCode === 500) {
    console.error("Server error:", err.message);
  }

  return sendError(res, statusCode, { message });
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler,
};
