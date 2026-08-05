/**
 * Console / development email provider.
 * Logs the message instead of sending — used when SMTP is not configured.
 */
function createConsoleProvider() {
  return {
    name: "console",
    async send({ to, subject, text, html, from, replyTo, meta }) {
      const preview =
        typeof text === "string" && text.length > 0
          ? text.slice(0, 400)
          : "(html-only body)";
      // eslint-disable-next-line no-console
      console.info(
        [
          "[email:console] Outbound message (SMTP not configured or provider=console)",
          `  from: ${from}`,
          replyTo ? `  replyTo: ${replyTo}` : null,
          `  to: ${to}`,
          `  subject: ${subject}`,
          meta?.kind ? `  kind: ${meta.kind}` : null,
          meta?.bookingNumber
            ? `  booking: ${meta.bookingNumber}`
            : null,
          "  text preview:",
          `  ${preview.replace(/\n/g, "\n  ")}`,
          html ? `  html bytes: ${Buffer.byteLength(html, "utf8")}` : null,
        ]
          .filter(Boolean)
          .join("\n")
      );
      return {
        provider: "console",
        messageId: `console-${Date.now()}`,
        logged: true,
      };
    },
  };
}

module.exports = { createConsoleProvider };
