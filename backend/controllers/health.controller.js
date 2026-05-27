const { testConnection } = require("../config/db");
const { sendSuccess, sendError } = require("../utils/apiResponse");
const asyncHandler = require("../utils/asyncHandler");

const getHealth = asyncHandler(async (_req, res) => {
  try {
    const dbStatus = await testConnection();

    return sendSuccess(res, 200, {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        serverTime: dbStatus.server_time,
      },
    });
  } catch (error) {
    return sendError(res, 503, {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error.message,
      },
    });
  }
});

module.exports = {
  getHealth,
};
