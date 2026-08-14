"use client";

import { formatPrice } from "@/lib/format";
import { formatStayDate, nightsBetween } from "@/lib/bookingPricing";

function Row({ label, value }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink-line py-3.5 last:border-b-0">
      <dt className="text-[11px] tracking-[0.2em] uppercase text-cream-muted">
        {label}
      </dt>
      <dd className="text-sm text-cream-dim">{value}</dd>
    </div>
  );
}

export default function BookingReviewStep({
  hotel,
  values,
  selectedOption,
  tariffSettings = {},
}) {
  const currency = hotel?.currency_code || "INR";
  const nights = nightsBetween(values.checkIn, values.checkOut);
  const guestLabel = [
    `${values.adults} adult${Number(values.adults) === 1 ? "" : "s"}`,
    Number(values.children) > 0
      ? `${values.children} child${Number(values.children) === 1 ? "" : "ren"}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  const onRequest = Boolean(selectedOption?.on_request);

  return (
    <section>
      <h3 className="text-xs tracking-[0.35em] uppercase text-gold">
        Booking Review
      </h3>
      <div className="gold-divider mt-4" />
      <p className="mt-6 text-sm leading-relaxed text-cream-dim">
        Confirm the details below. No payment is taken online — our team will
        confirm your reservation shortly after you submit.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="border border-ink-line bg-ink-soft p-6">
          <h4 className="text-[11px] tracking-[0.25em] uppercase text-gold">
            Stay
          </h4>
          <dl className="mt-2">
            <Row label="Hotel" value={hotel?.name || "—"} />
            <Row
              label="Dates"
              value={`${formatStayDate(values.checkIn)} → ${formatStayDate(
                values.checkOut
              )}`}
            />
            <Row label="Nights" value={nights > 0 ? String(nights) : "—"} />
            <Row label="Guests" value={guestLabel} />
            <Row label="Rooms" value={String(values.rooms)} />
            <Row label="Room type" value={selectedOption?.name || "—"} />
          </dl>
        </div>

        <div className="border border-ink-line bg-ink-soft p-6">
          <h4 className="text-[11px] tracking-[0.25em] uppercase text-gold">
            Rate breakdown
          </h4>
          <dl className="mt-2">
            {onRequest ? (
              <Row label="Payable amount" value="On request" />
            ) : (
              <>
                <Row
                  label="Nightly rate"
                  value={formatPrice(selectedOption.nightly_rate, currency)}
                />
                <Row
                  label="Subtotal"
                  value={formatPrice(selectedOption.subtotal, currency)}
                />
                <Row
                  label="Taxes / fees"
                  value={
                    Number(selectedOption.tax_amount) > 0
                      ? formatPrice(selectedOption.tax_amount, currency)
                      : tariffSettings.gst || "As applicable at property"
                  }
                />
                <Row
                  label="Estimated stay total"
                  value={formatPrice(selectedOption.total_amount, currency)}
                />
              </>
            )}
          </dl>
        </div>

        <div className="border border-ink-line bg-ink-soft p-6 lg:col-span-2">
          <h4 className="text-[11px] tracking-[0.25em] uppercase text-gold">
            Guest details
          </h4>
          <dl className="mt-2">
            <Row label="Full name" value={values.guestName} />
            <Row label="Email" value={values.guestEmail} />
            <Row label="Mobile" value={values.guestPhone} />
            {values.specialRequests.trim() ? (
              <Row label="Special requests" value={values.specialRequests} />
            ) : null}
            <Row
              label="Status emails"
              value={values.emailUpdates ? "On" : "Off"}
            />
            <Row
              label="SMS (soon)"
              value={values.smsOptIn ? "Opted in" : "Off"}
            />
            <Row
              label="WhatsApp (soon)"
              value={values.whatsappOptIn ? "Opted in" : "Off"}
            />
          </dl>
        </div>
      </div>
    </section>
  );
}
