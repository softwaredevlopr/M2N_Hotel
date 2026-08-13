/**
 * Booking notification preference helpers.
 * Shape matches migration 007 defaults. Unknown keys are rejected on write.
 */

const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  email_updates: true,
  sms_opt_in: false,
  whatsapp_opt_in: false,
});

const ALLOWED_KEYS = Object.freeze([
  "email_updates",
  "sms_opt_in",
  "whatsapp_opt_in",
]);

function asBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === 1 || value === "1") return true;
  if (value === "false" || value === 0 || value === "0") return false;
  return fallback;
}

/**
 * Normalize stored or partial prefs to the canonical object.
 * Missing/invalid input yields defaults (backward-compatible).
 */
function normalizeNotificationPreferences(raw) {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  return {
    email_updates: asBoolean(
      source.email_updates,
      DEFAULT_NOTIFICATION_PREFERENCES.email_updates
    ),
    sms_opt_in: asBoolean(
      source.sms_opt_in,
      DEFAULT_NOTIFICATION_PREFERENCES.sms_opt_in
    ),
    whatsapp_opt_in: asBoolean(
      source.whatsapp_opt_in,
      DEFAULT_NOTIFICATION_PREFERENCES.whatsapp_opt_in
    ),
  };
}

/**
 * Parse optional request-body prefs. Returns { ok, value, errors }.
 * `partial` merges onto defaults (or `base` when provided).
 */
function parseNotificationPreferences(input, { partial = false, base } = {}) {
  const errors = [];
  const fallback = normalizeNotificationPreferences(
    base || DEFAULT_NOTIFICATION_PREFERENCES
  );

  if (input === undefined || input === null) {
    return { ok: true, value: fallback, errors };
  }

  if (typeof input === "string") {
    try {
      input = JSON.parse(input);
    } catch {
      return {
        ok: false,
        value: fallback,
        errors: ["notification_preferences must be a JSON object"],
      };
    }
  }

  if (typeof input !== "object" || Array.isArray(input)) {
    return {
      ok: false,
      value: fallback,
      errors: ["notification_preferences must be a JSON object"],
    };
  }

  const unknown = Object.keys(input).filter((key) => !ALLOWED_KEYS.includes(key));
  if (unknown.length > 0) {
    errors.push(
      `notification_preferences has unknown key(s): ${unknown.join(", ")}`
    );
  }

  for (const key of ALLOWED_KEYS) {
    if (input[key] === undefined) continue;
    if (
      typeof input[key] !== "boolean" &&
      input[key] !== "true" &&
      input[key] !== "false" &&
      input[key] !== 0 &&
      input[key] !== 1 &&
      input[key] !== "0" &&
      input[key] !== "1"
    ) {
      errors.push(`notification_preferences.${key} must be a boolean`);
    }
  }

  if (errors.length > 0) {
    return { ok: false, value: fallback, errors };
  }

  if (!partial) {
    return {
      ok: true,
      value: normalizeNotificationPreferences({
        ...DEFAULT_NOTIFICATION_PREFERENCES,
        ...input,
      }),
      errors,
    };
  }

  return {
    ok: true,
    value: normalizeNotificationPreferences({
      ...fallback,
      ...input,
    }),
    errors,
  };
}

/** True when status/stay-update emails may be sent. */
function wantsEmailUpdates(prefs) {
  return normalizeNotificationPreferences(prefs).email_updates === true;
}

module.exports = {
  DEFAULT_NOTIFICATION_PREFERENCES,
  ALLOWED_KEYS,
  normalizeNotificationPreferences,
  parseNotificationPreferences,
  wantsEmailUpdates,
};
