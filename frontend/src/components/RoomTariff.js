import { BedDouble, ReceiptText, LogIn, LogOut } from "lucide-react";
import { formatPrice, formatTimeOfDay } from "@/lib/format";
import Reveal from "@/components/Reveal";
import { ON_REQUEST, AVAILABLE_WITH_ROOM_PLAN, getHotelTariff } from "@/lib/tariffs";

// Resolve one occupancy cell: a formatted price, a text note (e.g. "Available
// with room plan"), or the hotel's unavailable label. `isNote` lets the UI
// style non-price text differently from a rate.
function planCell(value, note, currencyCode, fallback = AVAILABLE_WITH_ROOM_PLAN) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return { text: formatPrice(numeric, currencyCode), isNote: false };
  }
  if (typeof note === "string" && note.trim().length > 0) {
    return { text: note, isNote: true };
  }
  return { text: fallback, isNote: true };
}

function extraBedLabel(value, currencyCode, fallback = ON_REQUEST) {
  if (value === null || value === undefined || value === "") return fallback;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) {
    return formatPrice(numeric, currencyCode);
  }
  return String(value);
}

/**
 * Professional hotel tariff: meal-plan matrix (Single / Double occupancy) and
 * the key booking policies. Data-driven via lib/tariffs.js — a cell shows a
 * price, a text note (e.g. "Available with room plan"), or the hotel's
 * unavailable label. Room-card prices are never repeated here.
 */
export default function RoomTariff({ hotel, tariff: tariffProp = null }) {
  const tariff = getHotelTariff(hotel, tariffProp);
  if (!tariff) return null;

  const currencyCode = tariff.currencyCode || "INR";
  const hotelName = hotel?.name || "Hotel";
  const mealPlans = tariff.mealPlans || [];
  const unavailable = tariff.unavailableLabel || ON_REQUEST;
  const checkIn = formatTimeOfDay(tariff.checkIn) || "12:00 PM";
  const checkOut = formatTimeOfDay(tariff.checkOut) || "11:00 AM";

  const policies = [
    {
      icon: BedDouble,
      label: "Extra Bed",
      value: extraBedLabel(tariff.extraBed, currencyCode, unavailable),
    },
    { icon: ReceiptText, label: "GST", value: tariff.gst || "As applicable" },
    { icon: LogIn, label: "Check-in", value: checkIn },
    { icon: LogOut, label: "Check-out", value: checkOut },
  ];

  return (
    <section
      id="tariff"
      className="relative bg-ink-soft py-28 sm:py-36 border-y border-ink-line"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Room Tariff
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h2 className="mt-8 font-display text-4xl sm:text-5xl lg:text-6xl leading-tight text-cream">
            Tariff &amp; Meal Plans
          </h2>
          <p className="mt-6 text-base leading-relaxed text-cream-dim">
            Per room, per night rates for {hotelName}. Choose a meal plan to
            suit your stay.
          </p>
        </div>

        {/* Meal-plan matrix */}
        {mealPlans.length > 0 && (
          <Reveal className="mx-auto mt-16 max-w-5xl">
            {/* Desktop table */}
            <div className="hidden overflow-hidden border border-ink-line sm:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-ink">
                    <th className="px-8 py-6 text-[11px] tracking-[0.28em] uppercase text-gold">
                      Meal Plan
                    </th>
                    <th className="px-8 py-6 text-center text-[11px] tracking-[0.28em] uppercase text-gold">
                      Single Occupancy
                    </th>
                    <th className="px-8 py-6 text-center text-[11px] tracking-[0.28em] uppercase text-gold">
                      Double Occupancy
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mealPlans.map((plan, index) => {
                    const single = planCell(
                      plan.single,
                      plan.singleNote,
                      currencyCode,
                      unavailable
                    );
                    const double = planCell(
                      plan.double,
                      plan.doubleNote,
                      currencyCode,
                      unavailable
                    );
                    return (
                      <tr
                        key={plan.id}
                        className={`border-t border-ink-line transition-colors hover:bg-ink/60 ${
                          index % 2 === 1 ? "bg-ink/30" : ""
                        }`}
                      >
                        <td className="px-8 py-6 font-display text-xl text-cream">
                          {plan.label}
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span
                            className={
                              single.isNote
                                ? "text-sm italic text-cream-muted"
                                : "font-display text-lg text-cream-dim"
                            }
                          >
                            {single.text}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span
                            className={
                              double.isNote
                                ? "text-sm italic text-cream-muted"
                                : "font-display text-lg text-cream-dim"
                            }
                          >
                            {double.text}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile stacked cards */}
            <div className="space-y-4 sm:hidden">
              {mealPlans.map((plan) => {
                const single = planCell(
                  plan.single,
                  plan.singleNote,
                  currencyCode,
                  unavailable
                );
                const double = planCell(
                  plan.double,
                  plan.doubleNote,
                  currencyCode,
                  unavailable
                );
                return (
                  <div
                    key={plan.id}
                    className="border border-ink-line bg-ink p-6"
                  >
                    <div className="font-display text-xl text-cream">
                      {plan.label}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                          Single
                        </div>
                        <div
                          className={`mt-1 ${
                            single.isNote
                              ? "text-sm italic text-cream-muted"
                              : "font-display text-lg text-gold"
                          }`}
                        >
                          {single.text}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                          Double
                        </div>
                        <div
                          className={`mt-1 ${
                            double.isNote
                              ? "text-sm italic text-cream-muted"
                              : "font-display text-lg text-gold"
                          }`}
                        >
                          {double.text}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {tariff.note && (
              <p className="mt-6 text-center text-xs tracking-[0.12em] text-cream-muted">
                {tariff.note}
              </p>
            )}
          </Reveal>
        )}

        {/* Booking policies */}
        <Reveal className="mx-auto mt-14 grid max-w-5xl grid-cols-2 gap-px border border-ink-line bg-ink-line lg:grid-cols-4">
          {policies.map((policy) => (
            <div
              key={policy.label}
              className="flex flex-col items-center gap-3 bg-ink px-6 py-8 text-center"
            >
              <div className="flex h-11 w-11 items-center justify-center border border-gold/40 text-gold">
                <policy.icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <div className="text-[10px] tracking-[0.25em] uppercase text-cream-muted">
                {policy.label}
              </div>
              <div className="font-display text-lg text-cream leading-tight">
                {policy.value}
              </div>
            </div>
          ))}
        </Reveal>

        {tariff.cancellationPolicy && (
          <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-cream-muted">
            {tariff.cancellationPolicy}
          </p>
        )}
      </div>
    </section>
  );
}
