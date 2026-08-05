/**
 * Phase 10F smoke: email provider factory + booking HTML templates.
 * Does not require SMTP credentials or a running database.
 *
 *   npm run verify:phase10f
 */

const assert = require("assert");
const {
  getEmailConfig,
  createEmailProvider,
  sendEmail,
  resetEmailProviderCache,
} = require("../services/email");
const {
  buildConfirmationEmail,
  buildCancellationEmail,
  buildStatusUpdateEmail,
} = require("../services/email/templates/bookingEmails");
const {
  deliverBookingEmail,
  bookingViewUrl,
} = require("../services/bookingNotification.service");

const sampleBooking = {
  booking_number: "M2N-20260805-TEST1",
  guest_name: "Asha Verma",
  guest_email: "phase10f@booking-selftest.invalid",
  hotel_name: "M2N Hotel : Aurelia Grand",
  hotel_slug: "m2n-hotel-aurelia-grand",
  room_type_name: "Deluxe Twin",
  check_in_date: "2026-09-10",
  check_out_date: "2026-09-12",
  adults: 2,
  children: 0,
  number_of_rooms: 1,
  booking_status: "pending",
  payment_status: "unpaid",
  subtotal: 0,
  tax_amount: 0,
  total_amount: 0,
  currency: "INR",
  cancellation_reason: null,
};

function check(label, condition, detail = "") {
  if (!condition) {
    throw new Error(`FAIL: ${label}${detail ? ` — ${detail}` : ""}`);
  }
  // eslint-disable-next-line no-console
  console.log(`  ✓ ${label}`);
}

async function main() {
  // eslint-disable-next-line no-console
  console.log("Phase 10F — email & notification smoke\n");

  process.env.EMAIL_ENABLED = "true";
  process.env.EMAIL_PROVIDER = "console";
  delete process.env.SMTP_HOST;
  resetEmailProviderCache();

  const config = getEmailConfig();
  check("resolves console provider without SMTP", config.provider === "console");
  check("exposes frontend URL for booking links", Boolean(config.frontendUrl));

  const provider = createEmailProvider(config);
  check("provider name is console", provider.name === "console");

  const confirmation = buildConfirmationEmail({
    booking: sampleBooking,
    brandName: config.brandName,
    viewUrl: bookingViewUrl(sampleBooking, config.frontendUrl),
  });
  check("confirmation has subject", /Booking request received/.test(confirmation.subject));
  check("confirmation HTML includes brand ink header", confirmation.html.includes("#0B0B0B"));
  check("confirmation HTML includes gold accent", confirmation.html.includes("#D71920"));
  check("confirmation text includes reference", confirmation.text.includes(sampleBooking.booking_number));

  const confirmedBooking = { ...sampleBooking, booking_status: "confirmed" };
  const confirmedMail = buildConfirmationEmail({
    booking: confirmedBooking,
    brandName: config.brandName,
    viewUrl: null,
  });
  check(
    "confirmed template uses confirmed subject",
    /Booking confirmed/.test(confirmedMail.subject)
  );

  const cancelled = buildCancellationEmail({
    booking: {
      ...sampleBooking,
      booking_status: "cancelled",
      cancellation_reason: "Guest requested",
    },
    brandName: config.brandName,
    viewUrl: null,
  });
  check("cancellation HTML includes reason", cancelled.html.includes("Guest requested"));
  check("cancellation subject", /cancelled/i.test(cancelled.subject));

  const statusUpdate = buildStatusUpdateEmail({
    booking: { ...sampleBooking, booking_status: "checked_in" },
    brandName: config.brandName,
    previousStatus: "confirmed",
    viewUrl: null,
  });
  check(
    "status update mentions previous and next",
    statusUpdate.html.includes("Confirmed") &&
      statusUpdate.html.includes("Checked In")
  );

  const sendResult = await sendEmail({
    to: sampleBooking.guest_email,
    subject: confirmation.subject,
    html: confirmation.html,
    text: confirmation.text,
    meta: { kind: "verify_phase10f" },
  });
  check("console send returns logged result", sendResult.logged === true);
  check("console send is not skipped", sendResult.skipped === false);

  const delivered = await deliverBookingEmail(
    "booking_confirmation",
    sampleBooking,
    buildConfirmationEmail
  );
  check("deliverBookingEmail succeeds via console", delivered.logged === true);

  process.env.EMAIL_ENABLED = "false";
  resetEmailProviderCache();
  const skipped = await sendEmail({
    to: sampleBooking.guest_email,
    subject: "skip",
    text: "skip",
  });
  check("EMAIL_ENABLED=false skips send", skipped.skipped === true);

  // Restore defaults for any subsequent process reuse.
  process.env.EMAIL_ENABLED = "true";
  process.env.EMAIL_PROVIDER = "console";
  resetEmailProviderCache();

  assert.ok(true);
  // eslint-disable-next-line no-console
  console.log("\nPhase 10F verify passed.");
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("\nPhase 10F verify failed:", error.message || error);
  process.exitCode = 1;
});
