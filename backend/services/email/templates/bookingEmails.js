const { escapeHtml, renderLayout, detailRows } = require("./layout");

function formatMoney(amount, currency) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return null;
  const code = (currency || "INR").toUpperCase();
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${code} ${n.toFixed(2)}`;
  }
}

function formatStatusLabel(status) {
  return String(status || "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function bookingDetailRows(booking) {
  const total = formatMoney(booking.total_amount, booking.currency);
  return detailRows([
    { label: "Reference", value: booking.booking_number },
    { label: "Property", value: booking.hotel_name },
    { label: "Room type", value: booking.room_type_name },
    { label: "Check-in", value: booking.check_in_date },
    { label: "Check-out", value: booking.check_out_date },
    {
      label: "Guests",
      value: `${booking.adults} adult(s)${
        Number(booking.children) > 0 ? `, ${booking.children} child(ren)` : ""
      }`,
    },
    { label: "Rooms", value: booking.number_of_rooms },
    { label: "Status", value: formatStatusLabel(booking.booking_status) },
    total && Number(booking.total_amount) > 0
      ? { label: "Indicative total", value: total }
      : { label: "Rate", value: "Price on request — our team will confirm" },
  ]);
}

function buildConfirmationEmail({ booking, brandName, viewUrl }) {
  const isConfirmed = booking.booking_status === "confirmed";
  const title = isConfirmed
    ? "Your reservation is confirmed"
    : "We received your booking request";
  const intro = isConfirmed
    ? `<p style="margin:0 0 12px;">Dear ${escapeHtml(booking.guest_name)},</p>
       <p style="margin:0;">Thank you for choosing ${escapeHtml(brandName)}. Your stay at <strong>${escapeHtml(booking.hotel_name)}</strong> is confirmed. Please keep this email for your records.</p>`
    : `<p style="margin:0 0 12px;">Dear ${escapeHtml(booking.guest_name)},</p>
       <p style="margin:0;">Thank you for choosing ${escapeHtml(brandName)}. We have received your reservation request for <strong>${escapeHtml(booking.hotel_name)}</strong>. Our team will review availability and confirm shortly.</p>`;

  const html = renderLayout({
    brandName,
    preheader: `${title} · ${booking.booking_number}`,
    title,
    introHtml: intro,
    bodyHtml: bookingDetailRows(booking),
    cta: viewUrl
      ? { href: viewUrl, label: "View reservation" }
      : null,
  });

  const text = [
    title,
    "",
    `Dear ${booking.guest_name},`,
    isConfirmed
      ? `Your stay at ${booking.hotel_name} is confirmed.`
      : `We received your booking request for ${booking.hotel_name}. Our team will confirm shortly.`,
    "",
    `Reference: ${booking.booking_number}`,
    `Property: ${booking.hotel_name}`,
    `Room type: ${booking.room_type_name}`,
    `Check-in: ${booking.check_in_date}`,
    `Check-out: ${booking.check_out_date}`,
    `Status: ${formatStatusLabel(booking.booking_status)}`,
    viewUrl ? `View: ${viewUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: isConfirmed
      ? `Booking confirmed · ${booking.booking_number}`
      : `Booking request received · ${booking.booking_number}`,
    html,
    text,
  };
}

function buildCancellationEmail({ booking, brandName, viewUrl }) {
  const reason = booking.cancellation_reason
    ? `<p style="margin:16px 0 0;">Reason: ${escapeHtml(booking.cancellation_reason)}</p>`
    : "";

  const html = renderLayout({
    brandName,
    preheader: `Booking cancelled · ${booking.booking_number}`,
    title: "Your reservation has been cancelled",
    introHtml: `<p style="margin:0 0 12px;">Dear ${escapeHtml(booking.guest_name)},</p>
      <p style="margin:0;">Your reservation at <strong>${escapeHtml(booking.hotel_name)}</strong> (${escapeHtml(booking.booking_number)}) has been cancelled. If this was unexpected, please contact the property.</p>${reason}`,
    bodyHtml: bookingDetailRows(booking),
    cta: viewUrl ? { href: viewUrl, label: "View reservation" } : null,
  });

  const text = [
    "Your reservation has been cancelled",
    "",
    `Dear ${booking.guest_name},`,
    `Booking ${booking.booking_number} at ${booking.hotel_name} has been cancelled.`,
    booking.cancellation_reason
      ? `Reason: ${booking.cancellation_reason}`
      : null,
    viewUrl ? `View: ${viewUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Booking cancelled · ${booking.booking_number}`,
    html,
    text,
  };
}

function buildStatusUpdateEmail({
  booking,
  brandName,
  viewUrl,
  previousStatus,
}) {
  const nextLabel = formatStatusLabel(booking.booking_status);
  const prevLabel = formatStatusLabel(previousStatus);
  const title = `Reservation update: ${nextLabel}`;

  const html = renderLayout({
    brandName,
    preheader: `${title} · ${booking.booking_number}`,
    title,
    introHtml: `<p style="margin:0 0 12px;">Dear ${escapeHtml(booking.guest_name)},</p>
      <p style="margin:0;">The status of your reservation at <strong>${escapeHtml(booking.hotel_name)}</strong> has changed from <strong>${escapeHtml(prevLabel)}</strong> to <strong>${escapeHtml(nextLabel)}</strong>.</p>`,
    bodyHtml: bookingDetailRows(booking),
    cta: viewUrl ? { href: viewUrl, label: "View reservation" } : null,
  });

  const text = [
    title,
    "",
    `Dear ${booking.guest_name},`,
    `Booking ${booking.booking_number}: ${prevLabel} → ${nextLabel}`,
    `Property: ${booking.hotel_name}`,
    `Check-in: ${booking.check_in_date}`,
    `Check-out: ${booking.check_out_date}`,
    viewUrl ? `View: ${viewUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject: `Booking ${nextLabel.toLowerCase()} · ${booking.booking_number}`,
    html,
    text,
  };
}

module.exports = {
  buildConfirmationEmail,
  buildCancellationEmail,
  buildStatusUpdateEmail,
  formatStatusLabel,
  formatMoney,
};
