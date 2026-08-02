const {
  MEAL_PLANS,
  DEFAULT_UNAVAILABLE_NOTE,
  DEFAULT_TARIFF_DISCLAIMER,
  DEFAULT_CANCELLATION_POLICY,
} = require("./tariffConstants");

function toNumericRate(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function isRateEffectiveOnDate(row, onDate) {
  if (!onDate) return true;
  const day = onDate instanceof Date ? onDate : new Date(onDate);
  if (Number.isNaN(day.getTime())) return true;

  if (row.valid_from) {
    const from = new Date(row.valid_from);
    if (day < from) return false;
  }
  if (row.valid_to) {
    const to = new Date(row.valid_to);
    if (day > to) return false;
  }
  return true;
}

function rateSpecificity(row) {
  const from = row.valid_from ? new Date(row.valid_from).getTime() : 0;
  const to = row.valid_to ? new Date(row.valid_to).getTime() : Number.MAX_SAFE_INTEGER;
  return to - from;
}

/**
 * Pick the best matching rate row for a meal plan + occupancy slot.
 * Prefers narrower seasonal windows, then higher sort_order, then newest.
 */
function pickRateRow(rows, mealPlan, occupancy, onDate = new Date()) {
  const candidates = rows
    .filter(
      (row) =>
        row.meal_plan === mealPlan &&
        row.occupancy === occupancy &&
        row.status === "active" &&
        isRateEffectiveOnDate(row, onDate)
    )
    .sort((a, b) => {
      const specDiff = rateSpecificity(a) - rateSpecificity(b);
      if (specDiff !== 0) return specDiff;
      const orderDiff = (b.sort_order || 0) - (a.sort_order || 0);
      if (orderDiff !== 0) return orderDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  return candidates[0] || null;
}

function buildMealPlanMatrix(rateRows, onDate = new Date()) {
  return MEAL_PLANS.map((plan) => {
    const singleRow = pickRateRow(rateRows, plan.id, "single", onDate);
    const doubleRow = pickRateRow(rateRows, plan.id, "double", onDate);

    const single = toNumericRate(singleRow?.price);
    const double = toNumericRate(doubleRow?.price);

    const singleNote =
      single == null && singleRow?.display_note
        ? singleRow.display_note
        : single == null
          ? DEFAULT_UNAVAILABLE_NOTE
          : null;

    const doubleNote =
      double == null && doubleRow?.display_note
        ? doubleRow.display_note
        : double == null
          ? DEFAULT_UNAVAILABLE_NOTE
          : null;

    return {
      id: plan.id,
      label: plan.label,
      single,
      double,
      singleNote: single == null ? singleNote : null,
      doubleNote: double == null ? doubleNote : null,
    };
  });
}

function resolveTariffSettings(hotel) {
  const settings =
    hotel?.metadata?.tariff_settings &&
    typeof hotel.metadata.tariff_settings === "object"
      ? hotel.metadata.tariff_settings
      : {};

  return {
    note: settings.note || DEFAULT_TARIFF_DISCLAIMER,
    extraBed: settings.extra_bed ?? settings.extraBed ?? null,
    gst: settings.gst || "GST as applicable",
    cancellationPolicy:
      settings.cancellation_policy ||
      settings.cancellationPolicy ||
      DEFAULT_CANCELLATION_POLICY,
    unavailableLabel:
      settings.unavailable_label ||
      settings.unavailableLabel ||
      DEFAULT_UNAVAILABLE_NOTE,
  };
}

/**
 * Build the public tariff payload consumed by the frontend RoomTariff section.
 * Matrix rows use hotel-wide rates (room_type_id IS NULL) by default.
 */
function buildPublicTariff(hotel, rateRows, { onDate = new Date(), roomTypeId = null } = {}) {
  const scopedRows = rateRows.filter((row) => {
    if (roomTypeId) {
      return row.room_type_id === roomTypeId || row.room_type_id == null;
    }
    return row.room_type_id == null;
  });

  const matrixRows = scopedRows.filter((row) => row.room_type_id == null);
  const settings = resolveTariffSettings(hotel);

  return {
    currencyCode: hotel?.currency_code || "INR",
    note: settings.note,
    unavailableLabel: settings.unavailableLabel,
    mealPlans: buildMealPlanMatrix(matrixRows, onDate),
    extraBed: settings.extraBed,
    gst: settings.gst,
    checkIn: hotel?.check_in_time || null,
    checkOut: hotel?.check_out_time || null,
    cancellationPolicy: settings.cancellationPolicy,
    rooms: [],
  };
}

module.exports = {
  buildPublicTariff,
  buildMealPlanMatrix,
  pickRateRow,
  isRateEffectiveOnDate,
  toNumericRate,
};
