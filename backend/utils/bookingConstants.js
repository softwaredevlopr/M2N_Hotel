// Booking domain constants. These mirror the CHECK constraints in
// migrations/004_bookings.sql — keep both in sync.

const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "checked_in",
  "checked_out",
  "cancelled",
  "no_show",
];

const PAYMENT_STATUSES = ["unpaid", "partial", "paid", "refunded"];

const BOOKING_SOURCES = ["website", "admin", "phone", "walk_in", "ota"];

// Sources a guest may self-select on the public endpoint. Admin-only sources are
// rejected so a public caller cannot mark a reservation as staff-entered.
const PUBLIC_BOOKING_SOURCES = ["website"];

// Reservations in these states hold inventory for their date range.
const INVENTORY_BLOCKING_STATUSES = ["pending", "confirmed", "checked_in"];

// Physical rooms in these states are sellable. `occupied` stays sellable because
// it describes today's state, not a block on future date ranges.
const SELLABLE_ROOM_STATUSES = ["available", "occupied"];

const TERMINAL_BOOKING_STATUSES = ["checked_out", "cancelled", "no_show"];

const BOOKING_STATUS_TRANSITIONS = {
  pending: ["confirmed", "cancelled", "no_show"],
  confirmed: ["checked_in", "cancelled", "no_show"],
  checked_in: ["checked_out", "cancelled"],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

function canTransitionBookingStatus(from, to) {
  if (from === to) return true;
  return (BOOKING_STATUS_TRANSITIONS[from] || []).includes(to);
}

module.exports = {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  BOOKING_SOURCES,
  PUBLIC_BOOKING_SOURCES,
  INVENTORY_BLOCKING_STATUSES,
  SELLABLE_ROOM_STATUSES,
  TERMINAL_BOOKING_STATUSES,
  BOOKING_STATUS_TRANSITIONS,
  canTransitionBookingStatus,
};
