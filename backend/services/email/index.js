const emailService = require("./email.service");
const { createEmailProvider } = require("./providers");
const { getEmailConfig } = require("./config");

module.exports = {
  sendEmail: emailService.sendEmail,
  getEmailConfig,
  createEmailProvider,
  resetEmailProviderCache: emailService.resetEmailProviderCache,
};
