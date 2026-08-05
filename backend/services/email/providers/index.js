const { getEmailConfig } = require("../config");
const { createConsoleProvider } = require("./console.provider");
const { createSmtpProvider } = require("./smtp.provider");

/**
 * Factory for the active email transport.
 * Register additional providers here (e.g. resend, sendgrid) behind EMAIL_PROVIDER.
 */
function createEmailProvider(config = getEmailConfig()) {
  if (config.provider === "smtp") {
    if (!config.smtp.configured) {
      // eslint-disable-next-line no-console
      console.warn(
        "[email] EMAIL_PROVIDER=smtp but SMTP_HOST is empty — falling back to console"
      );
      return createConsoleProvider();
    }
    return createSmtpProvider(config.smtp);
  }
  return createConsoleProvider();
}

module.exports = { createEmailProvider };
