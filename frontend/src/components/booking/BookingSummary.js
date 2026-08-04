import Link from "next/link";
import { formatPrice, formatTimeOfDay } from "@/lib/format";
import {
  calculateStayTotals,
  formatStayDate,
  getTariffSettings,
  lowestPublishedRate,
  nightsBetween,
} from "@/lib/bookingPricing";

function Row({ label, value, muted = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-[11px] tracking-[0.2em] uppercase text-cream-muted">
        {label}
      </dt>
      <dd
        className={`text-right text-sm ${
          muted ? "text-cream-muted" : "text-cream-dim"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * Live stay summary sidebar. Prefers API availability amounts when present so
 * the figure matches GET /api/bookings/availability and POST /api/bookings.
 */
export default function BookingSummary({
  hotel,
  roomType,
  availabilityOption = null,
  tariff,
  checkIn,
  checkOut,
  adults,
  children,
  rooms,
  className = "",
}) {
  const currency =
    hotel?.currency_code || availabilityOption?.currency || "INR";
  const nights = nightsBetween(checkIn, checkOut);

  const totals = availabilityOption
    ? {
        onRequest: Boolean(availabilityOption.on_request),
        nightlyRate: availabilityOption.nightly_rate,
        nights,
        rooms: Number(rooms) || 1,
        subtotal: Number(availabilityOption.subtotal) || 0,
        tax: Number(availabilityOption.tax_amount) || 0,
        total: Number(availabilityOption.total_amount) || 0,
      }
    : {
        ...calculateStayTotals({
          basePrice: roomType?.base_price,
          nights,
          rooms,
        }),
        tax: 0,
      };

  const settings = getTariffSettings(hotel);
  const publishedFrom = totals.onRequest ? lowestPublishedRate(tariff) : null;

  const guestLabel = [
    `${adults} adult${Number(adults) === 1 ? "" : "s"}`,
    Number(children) > 0
      ? `${children} child${Number(children) === 1 ? "" : "ren"}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <aside
      aria-label="Stay summary"
      className={`border border-ink-line bg-ink-soft p-6 sm:p-7 ${className}`}
    >
      <h2 className="font-display text-xl text-cream">Your Stay</h2>
      <div className="gold-divider mt-4" />

      <dl className="mt-5 divide-y divide-ink-line/70">
        <Row label="Hotel" value={hotel?.name || "Not selected"} muted={!hotel} />
        <Row
          label="Room"
          value={
            availabilityOption?.name || roomType?.name || "Not selected"
          }
          muted={!availabilityOption && !roomType}
        />
        <Row
          label="Check-in"
          value={checkIn ? formatStayDate(checkIn) : "Not selected"}
          muted={!checkIn}
        />
        <Row
          label="Check-out"
          value={checkOut ? formatStayDate(checkOut) : "Not selected"}
          muted={!checkOut}
        />
        <Row
          label="Nights"
          value={nights > 0 ? nights : "—"}
          muted={nights <= 0}
        />
        <Row label="Guests" value={guestLabel} />
        <Row label="Rooms" value={rooms} />
      </dl>

      <div className="mt-5 border-t border-ink-line pt-5">
        {totals.onRequest ? (
          <>
            <p className="text-xs tracking-[0.25em] uppercase text-gold">
              Price on request
            </p>
            <p className="mt-3 text-sm leading-relaxed text-cream-dim">
              {publishedFrom
                ? `Published tariff starts at ${formatPrice(
                    publishedFrom,
                    currency
                  )} per room, per night. Your final rate depends on the meal plan and is confirmed by our team.`
                : "Our team will confirm the rate for these dates when they contact you."}
            </p>
            {hotel?.slug && (
              <Link
                href={`/hotels/${hotel.slug}#tariff`}
                className="mt-3 inline-block text-xs tracking-[0.2em] uppercase text-cream-muted underline-offset-4 hover:text-gold hover:underline"
              >
                View full tariff
              </Link>
            )}
          </>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-cream-dim">
                {formatPrice(totals.nightlyRate, currency)}
                <span className="text-cream-muted">
                  {" "}
                  × {totals.nights} night{totals.nights === 1 ? "" : "s"}
                  {totals.rooms > 1 ? ` × ${totals.rooms} rooms` : ""}
                </span>
              </span>
              <span className="text-sm text-cream-dim">
                {formatPrice(totals.subtotal, currency)}
              </span>
            </div>
            {totals.tax > 0 && (
              <div className="mt-2 flex items-baseline justify-between gap-4 text-sm text-cream-muted">
                <span>Taxes / fees</span>
                <span>{formatPrice(totals.tax, currency)}</span>
              </div>
            )}
            <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-ink-line pt-4">
              <span className="text-xs tracking-[0.25em] uppercase text-cream-muted">
                Estimated total
              </span>
              <span className="font-display text-2xl text-gold">
                {formatPrice(totals.total ?? totals.subtotal, currency)}
              </span>
            </div>
          </>
        )}

        <ul className="mt-5 space-y-1.5 text-xs leading-relaxed text-cream-muted">
          <li>
            {settings.gst
              ? `Taxes: ${settings.gst}`
              : "Taxes as applicable, charged at the property."}
          </li>
          {settings.extra_bed ? (
            <li>
              Extra bed: {formatPrice(settings.extra_bed, currency)} per night.
            </li>
          ) : null}
          {hotel?.check_in_time ? (
            <li>
              Check-in from {formatTimeOfDay(hotel.check_in_time)}
              {hotel.check_out_time
                ? ` · Check-out by ${formatTimeOfDay(hotel.check_out_time)}`
                : ""}
              .
            </li>
          ) : null}
          <li>No payment is taken online. Your request is confirmed by our team.</li>
        </ul>
      </div>
    </aside>
  );
}
