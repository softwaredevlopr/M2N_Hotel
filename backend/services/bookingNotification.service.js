/**
 * Booking notification orchestration.
 * Email failures never fail the booking API — they are logged and swallowed.
 */

const { sendEmail, getEmailConfig } = require("./email");
const {
  buildConfirmationEmail,
  buildCancellationEmail,
  buildStatusUpdateEmail,
} = require("./email/templates/bookingEmails");

function bookingViewUrl(booking, frontendUrl) {
  if (!booking?.booking_number || !frontendUrl) return null;
  return `${frontendUrl}/booking/${encodeURIComponent(booking.booking_number)}`;
}

async function deliverBookingEmail(kind, booking, buildMessage) {
  if (!booking?.guest_email) {
    return { skipped: true, reason: "missing guest_email" };
  }

  const config = getEmailConfig();
  const message = buildMessage({
    booking,
    brandName: config.brandName,
    viewUrl: bookingViewUrl(booking, config.frontendUrl),
  });

  return sendEmail({
    to: booking.guest_email,
    subject: message.subject,
    html: message.html,
    text: message.text,
    meta: {
      kind,
      bookingNumber: booking.booking_number,
    },
  });
}

/**
 * Fire-and-forget wrapper so controllers never await email latency unless they
 * explicitly choose to. Errors are logged; they do not propagate.
 */
function notifySafely(label, work) {
  Promise.resolve()
    .then(work)
    .then((result) => {
      if (result?.skipped) return;
      // eslint-disable-next-line no-console
      console.info(
        `[booking-notify] ${label} via ${result?.provider || "unknown"}` +
          (result?.messageId ? ` (${result.messageId})` : "")
      );
    })
    .catch((error) => {
      // eslint-disable-next-line no-console
      console.error(
        `[booking-notify] ${label} failed:`,
        error?.message || error
      );
    });
}

function notifyBookingConfirmation(booking) {
  notifySafely("confirmation", () =>
    deliverBookingEmail("booking_confirmation", booking, buildConfirmationEmail)
  );
}

function notifyBookingCancellation(booking) {
  notifySafely("cancellation", () =>
    deliverBookingEmail("booking_cancellation", booking, buildCancellationEmail)
  );
}

function notifyBookingStatusUpdate(booking, previousStatus) {
  notifySafely("status_update", () =>
    deliverBookingEmail("booking_status_update", booking, (args) =>
      buildStatusUpdateEmail({ ...args, previousStatus })
    )
  );
}

/**
 * Chooses the right template after an admin status change.
 * Payment-only updates do not trigger guest email.
 */
function notifyBookingStatusChange(previousBooking, nextBooking) {
  if (!nextBooking) return;
  const prev = previousBooking?.booking_status;
  const next = nextBooking.booking_status;
  if (!next || prev === next) return;

  if (next === "cancelled") {
    notifyBookingCancellation(nextBooking);
    return;
  }

  // Fresh confirmation (pending → confirmed) uses the confirmation template.
  if (next === "confirmed" && prev === "pending") {
    notifyBookingConfirmation(nextBooking);
    return;
  }

  notifyBookingStatusUpdate(nextBooking, prev);
}

module.exports = {
  notifyBookingConfirmation,
  notifyBookingCancellation,
  notifyBookingStatusUpdate,
  notifyBookingStatusChange,
  deliverBookingEmail,
  bookingViewUrl,
};
