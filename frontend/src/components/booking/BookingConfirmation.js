"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { formatStayDate } from "@/lib/bookingPricing";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./formStyles";

const STATUS_LABELS = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  checked_out: "Checked out",
  cancelled: "Cancelled",
  no_show: "No show",
};

export default function BookingConfirmation({ booking, hotelSlug }) {
  if (!booking) return null;

  const currency = booking.currency || "INR";
  const statusKey = booking.booking_status || "pending";
  const statusLabel = STATUS_LABELS[statusKey] || statusKey;
  const viewHotelSlug = hotelSlug || booking.hotel_slug;

  return (
    <section className="mx-auto max-w-2xl text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10">
        <CheckCircle2 className="h-8 w-8 text-gold" strokeWidth={1.5} />
      </div>

      <h3 className="mt-8 font-display text-3xl text-cream sm:text-4xl">
        Booking Received
      </h3>
      <p className="mt-4 text-sm leading-relaxed text-cream-dim sm:text-base">
        Thank you. Your reservation request has been submitted. Our team will
        confirm shortly — no payment was taken online.
      </p>

      <div className="mt-10 border border-ink-line bg-ink-soft p-6 text-left sm:p-8">
        <dl className="divide-y divide-ink-line/70">
          <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <dt className="text-[11px] tracking-[0.2em] uppercase text-cream-muted">
              Booking reference
            </dt>
            <dd className="font-display text-xl text-gold">
              {booking.booking_number}
            </dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <dt className="text-[11px] tracking-[0.2em] uppercase text-cream-muted">
              Status
            </dt>
            <dd className="text-sm text-cream-dim">{statusLabel}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <dt className="text-[11px] tracking-[0.2em] uppercase text-cream-muted">
              Hotel
            </dt>
            <dd className="text-sm text-cream-dim">{booking.hotel_name}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <dt className="text-[11px] tracking-[0.2em] uppercase text-cream-muted">
              Room
            </dt>
            <dd className="text-sm text-cream-dim">{booking.room_type_name}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <dt className="text-[11px] tracking-[0.2em] uppercase text-cream-muted">
              Dates
            </dt>
            <dd className="text-sm text-cream-dim">
              {formatStayDate(booking.check_in_date)} →{" "}
              {formatStayDate(booking.check_out_date)}
              {booking.nights
                ? ` · ${booking.nights} night${booking.nights === 1 ? "" : "s"}`
                : ""}
            </dd>
          </div>
          {Number(booking.total_amount) > 0 && (
            <div className="flex flex-wrap items-baseline justify-between gap-2 py-3">
              <dt className="text-[11px] tracking-[0.2em] uppercase text-cream-muted">
                Estimated total
              </dt>
              <dd className="text-sm text-gold">
                {formatPrice(booking.total_amount, currency)}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
        <Link href="/" className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}>
          Back to Home
        </Link>
        {viewHotelSlug && (
          <Link
            href={`/hotels/${viewHotelSlug}`}
            className={`${SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
          >
            View Hotel
          </Link>
        )}
      </div>

      <p className="mt-8 text-xs leading-relaxed text-cream-muted">
        Save your reference{" "}
        <span className="text-cream-dim">{booking.booking_number}</span>. You can
        also look it up later at{" "}
        <Link
          href={`/booking/${encodeURIComponent(booking.booking_number)}`}
          className="text-gold underline-offset-4 hover:underline"
        >
          the booking page
        </Link>{" "}
        with the email or mobile used above.
      </p>
    </section>
  );
}
