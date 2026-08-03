// The guest booking lookup API requires the email or phone held on the
// reservation. After a booking is created we keep that contact detail in
// sessionStorage so the confirmation page can load without asking the guest to
// re-type it. It is scoped to the tab, cleared when the tab closes, and never
// sent anywhere except the lookup endpoint.

const STORAGE_PREFIX = "m2n.booking.";

function storageKey(bookingNumber) {
  return `${STORAGE_PREFIX}${String(bookingNumber).toUpperCase()}`;
}

function getStore() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function rememberBookingContact(bookingNumber, { email, phone } = {}) {
  const store = getStore();
  if (!store || !bookingNumber) return;
  try {
    store.setItem(
      storageKey(bookingNumber),
      JSON.stringify({ email: email || "", phone: phone || "" })
    );
  } catch {
    // Storage may be full or blocked — the confirmation page falls back to
    // asking the guest to verify manually.
  }
}

export function recallBookingContact(bookingNumber) {
  const store = getStore();
  if (!store || !bookingNumber) return null;
  try {
    const raw = store.getItem(storageKey(bookingNumber));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.email && !parsed?.phone) return null;
    return { email: parsed.email || "", phone: parsed.phone || "" };
  } catch {
    return null;
  }
}

export function forgetBookingContact(bookingNumber) {
  const store = getStore();
  if (!store || !bookingNumber) return;
  try {
    store.removeItem(storageKey(bookingNumber));
  } catch {
    // Nothing to recover from.
  }
}
