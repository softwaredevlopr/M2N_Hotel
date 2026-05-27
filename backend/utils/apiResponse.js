function sendSuccess(res, statusCode = 200, payload = {}) {
  return res.status(statusCode).json({
    success: true,
    ...payload,
  });
}

function sendError(res, statusCode = 500, payload = {}) {
  return res.status(statusCode).json({
    success: false,
    ...payload,
  });
}

function sendNotFound(res, message) {
  return sendError(res, 404, { message });
}

function sendValidationError(res, errors) {
  return sendError(res, 400, {
    message: "Validation failed",
    errors,
  });
}

module.exports = {
  sendSuccess,
  sendError,
  sendNotFound,
  sendValidationError,
};
