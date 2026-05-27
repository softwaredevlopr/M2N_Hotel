const { sendSuccess } = require("../utils/apiResponse");

function getRoot(_req, res) {
  return sendSuccess(res, 200, {
    message: "M2N Hotel API is running",
    version: "1.0.0",
  });
}

module.exports = {
  getRoot,
};
