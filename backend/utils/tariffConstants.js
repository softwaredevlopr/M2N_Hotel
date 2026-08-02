const MEAL_PLANS = [
  { id: "no_meal", label: "No Meal" },
  { id: "breakfast", label: "Breakfast" },
  { id: "breakfast_one_meal", label: "Breakfast + One Meal" },
  { id: "all_meals", label: "All Meals" },
];

const OCCUPANCY_TYPES = ["single", "double"];

const ALLOWED_TARIFF_STATUSES = ["active", "inactive"];

const DEFAULT_UNAVAILABLE_NOTE = "Available with room plan";

const DEFAULT_TARIFF_DISCLAIMER =
  "Rates are per room, per night and subject to availability. Meal inclusions and offers may vary. Please confirm while booking.";

const DEFAULT_CANCELLATION_POLICY =
  "Cancellations made at least 24 hours before the scheduled check-in time are eligible for a full refund of the room charges. Cancellations made within 24 hours of check-in, or in the event of a no-show, may attract a charge equivalent to one night's stay. Meal plans and any prepaid extras follow the same notice period unless otherwise confirmed in writing. For group bookings or special rates, a separate cancellation schedule may apply as stated on your confirmation.";

module.exports = {
  MEAL_PLANS,
  OCCUPANCY_TYPES,
  ALLOWED_TARIFF_STATUSES,
  DEFAULT_UNAVAILABLE_NOTE,
  DEFAULT_TARIFF_DISCLAIMER,
  DEFAULT_CANCELLATION_POLICY,
};
