const nodemailer = require("nodemailer");

/**
 * SMTP provider via nodemailer.
 * Future API providers (SendGrid, Resend, etc.) should expose the same
 * `{ name, send(message) }` shape and be registered in createEmailProvider().
 */
function createSmtpProvider(smtpConfig) {
  if (!smtpConfig?.host) {
    throw new Error("SMTP provider requires SMTP_HOST");
  }

  const transport = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth:
      smtpConfig.user && smtpConfig.pass
        ? { user: smtpConfig.user, pass: smtpConfig.pass }
        : undefined,
  });

  return {
    name: "smtp",
    async send({ to, subject, text, html, from, replyTo }) {
      const info = await transport.sendMail({
        from,
        to,
        subject,
        text,
        html,
        replyTo: replyTo || undefined,
      });
      return {
        provider: "smtp",
        messageId: info.messageId || null,
        accepted: info.accepted || [],
        rejected: info.rejected || [],
      };
    },
  };
}

module.exports = { createSmtpProvider };
