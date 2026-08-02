// Browser-only admin session helpers (localStorage). Safe to import from
// client components; no-ops / returns null when `window` is unavailable.

export const ADMIN_TOKEN_KEY = "m2n_admin_access_token";
export const ADMIN_PROFILE_KEY = "m2n_admin_profile";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAdminToken() {
  if (!canUseStorage()) return null;
  try {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    return token && token.trim() ? token : null;
  } catch {
    return null;
  }
}

export function getAdminProfile() {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(ADMIN_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAdminSession(accessToken, admin) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ADMIN_TOKEN_KEY, accessToken);
  window.localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(admin || {}));
}

export function clearAdminSession() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_PROFILE_KEY);
}

export function isAdminAuthenticated() {
  return Boolean(getAdminToken());
}
