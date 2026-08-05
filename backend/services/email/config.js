/**
 * Email configuration from environment.
 * SMTP credentials are never required — missing host falls back to console.
 */

function envBool(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(raw).toLowerCase());
}

function envInt(name, fallback) {
  const n = Number.parseInt(process.env[name] || "", 10);
  return Number.isFinite(n) ? n : fallback;
}

function getEmailConfig() {
  const enabled = envBool("EMAIL_ENABLED", true);
  const from =
    process.env.EMAIL_FROM || "M2N Hotels <noreply@m2nhotels.example>";
  const replyTo = process.env.EMAIL_REPLY_TO || null;
  const frontendUrl = (
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_SITE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");

  const smtpHost = (process.env.SMTP_HOST || "").trim();
  const smtpConfigured = Boolean(smtpHost);

  let provider = (process.env.EMAIL_PROVIDER || "auto").toLowerCase().trim();
  if (!["auto", "console", "smtp"].includes(provider)) {
    provider = "auto";
  }

  let resolvedProvider = provider;
  if (provider === "auto") {
    resolvedProvider = smtpConfigured ? "smtp" : "console";
  }

  return {
    enabled,
    from,
    replyTo,
    frontendUrl,
    brandName: process.env.EMAIL_BRAND_NAME || "M2N Hotels",
    provider: resolvedProvider,
    requestedProvider: provider,
    smtp: {
      host: smtpHost || null,
      port: envInt("SMTP_PORT", 587),
      secure: envBool("SMTP_SECURE", false),
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
      configured: smtpConfigured,
    },
  };
}

module.exports = { getEmailConfig };
