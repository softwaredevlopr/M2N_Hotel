const { getEmailConfig } = require("./config");
const { createEmailProvider } = require("./providers");

let cachedProvider = null;
let cachedProviderKey = null;

function resolveProvider(config) {
  const key = `${config.provider}:${config.smtp.host || ""}:${config.smtp.port}`;
  if (!cachedProvider || cachedProviderKey !== key) {
    cachedProvider = createEmailProvider(config);
    cachedProviderKey = key;
  }
  return cachedProvider;
}

/**
 * Provider-agnostic send API.
 * Callers pass a normalised message; transport is selected from env.
 */
async function sendEmail(message, options = {}) {
  const config = options.config || getEmailConfig();
  if (!config.enabled) {
    return { skipped: true, reason: "EMAIL_ENABLED=false" };
  }

  const to = String(message.to || "").trim();
  if (!to) {
    throw new Error("sendEmail requires a recipient (to)");
  }
  if (!message.subject) {
    throw new Error("sendEmail requires a subject");
  }
  if (!message.html && !message.text) {
    throw new Error("sendEmail requires html or text");
  }

  const provider = options.provider || resolveProvider(config);
  const result = await provider.send({
    to,
    subject: message.subject,
    text: message.text || undefined,
    html: message.html || undefined,
    from: message.from || config.from,
    replyTo: message.replyTo || config.replyTo || undefined,
    meta: message.meta || {},
  });

  return { skipped: false, ...result };
}

/** Reset cached transport (tests / verify scripts). */
function resetEmailProviderCache() {
  cachedProvider = null;
  cachedProviderKey = null;
}

module.exports = {
  sendEmail,
  getEmailConfig,
  resetEmailProviderCache,
};
