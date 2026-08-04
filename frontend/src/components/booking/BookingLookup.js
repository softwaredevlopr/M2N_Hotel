"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Loader2,
  Printer,
} from "lucide-react";
import { getBookingByNumber } from "@/lib/api";
import { recallBookingContact } from "@/lib/bookingSession";
import { formatPrice, formatTimeOfDay } from "@/lib/format";
import { formatStayDate } from "@/lib/bookingPricing";
import {
  LABEL_CLASS,
  PRIMARY_BUTTON_CLASS,
  SECONDARY_BUTTON_CLASS,
  inputClass,
} from "./formStyles";

const STATUS_LABELS = {
  pending: {
    label: "Awaiting confirmation",
    note: "We have received your request. Our team will confirm your reservation shortly.",
  },
  confirmed: {
    label: "Confirmed",
    note: "Your reservation is confirmed. We look forward to welcoming you.",
  },
  checked_in: { label: "Checked in", note: "Enjoy your stay with us." },
  checked_out: { label: "Checked out", note: "Thank you for staying with us." },
  cancelled: {
    label: "Cancelled",
    note: "This reservation has been cancelled. Contact us if this is unexpected.",
  },
  no_show: {
    label: "No show",
    note: "This reservation was marked as a no-show. Contact us if this is unexpected.",
  },
};

const PAYMENT_LABELS = {
  unpaid: "Payable at the property",
  partial: "Partially paid",
  paid: "Paid",
  refunded: "Refunded",
};

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-ink-line py-3.5 last:border-b-0">
      <dt className="text-[11px] tracking-[0.2em] uppercase text-cream-muted">
        {label}
      </dt>
      <dd className="text-sm text-cream-dim">{value}</dd>
    </div>
  );
}

export default function BookingLookup({ bookingNumber }) {
  const [status, setStatus] = useState("loading"); // loading | verify | ready | error
  const [booking, setBooking] = useState(null);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(
    async ({ email, phone }) => {
      const result = await getBookingByNumber(bookingNumber, { email, phone });

      if (result.networkError) {
        setStatus("error");
        setMessage(
          "Unable to reach the server. Please check your connection and try again."
        );
        return false;
      }

      if (!result.ok) {
        if (result.status === 404) {
          setMessage(
            "We could not find a booking with that reference and contact detail. Please check and try again."
          );
        } else if (result.status === 429) {
          setMessage("Too many attempts. Please wait a moment and try again.");
        } else {
          setMessage(
            result.data?.message ||
              "We could not load this booking. Please try again shortly."
          );
        }
        return false;
      }

      setBooking(result.data?.data || null);
      setStatus("ready");
      setMessage("");
      return true;
    },
    [bookingNumber]
  );

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const saved = recallBookingContact(bookingNumber);
      if (!saved) {
        if (active) setStatus("verify");
        return;
      }

      const loaded = await load(saved);
      if (active && !loaded) setStatus("verify");
    }

    bootstrap();
    return () => {
      active = false;
    };
  }, [bookingNumber, load]);

  async function handleVerify(event) {
    event.preventDefault();
    const value = contact.trim();
    if (!value) {
      setMessage("Enter the email or mobile number used for the booking.");
      return;
    }

    setVerifying(true);
    setMessage("");
    const isEmail = value.includes("@");
    await load(isEmail ? { email: value } : { phone: value });
    setVerifying(false);
  }

  if (status === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="border border-ink-line bg-ink-soft p-10 text-center"
      >
        <Loader2
          className="mx-auto h-8 w-8 animate-spin text-gold"
          strokeWidth={1.5}
        />
        <p className="mt-5 text-xs tracking-[0.35em] uppercase text-cream-muted">
          Loading your booking
        </p>
      </div>
    );
  }

  if (status !== "ready") {
    return (
      <div className="border border-ink-line bg-ink-soft p-6 sm:p-10">
        <h2 className="font-display text-2xl text-cream">View your booking</h2>
        <div className="gold-divider mt-4" />
        <p className="mt-5 text-sm leading-relaxed text-cream-dim">
          For your security, confirm the email address or mobile number used for
          booking{" "}
          <span className="text-gold">{bookingNumber}</span>.
        </p>

        {message && (
          <div
            role="alert"
            className="mt-6 flex gap-3 border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
          >
            <AlertCircle
              className="h-5 w-5 flex-shrink-0 text-gold"
              strokeWidth={1.5}
            />
            <p>{message}</p>
          </div>
        )}

        <form onSubmit={handleVerify} className="mt-6" noValidate>
          <label htmlFor="bk-lookup" className={LABEL_CLASS}>
            Email or Mobile Number
          </label>
          <input
            id="bk-lookup"
            type="text"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            className={inputClass(Boolean(message))}
            placeholder="you@example.com"
            autoComplete="email"
          />
          <button
            type="submit"
            disabled={verifying}
            className={`${PRIMARY_BUTTON_CLASS} mt-6 w-full sm:w-auto`}
          >
            {verifying && (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            )}
            {verifying ? "Checking..." : "View Booking"}
          </button>
        </form>
      </div>
    );
  }

  const statusInfo =
    STATUS_LABELS[booking.booking_status] || STATUS_LABELS.pending;
  const currency = booking.currency || "INR";
  const hasAmount = Number(booking.total_amount) > 0;
  const guestLabel = [
    `${booking.adults} adult${booking.adults === 1 ? "" : "s"}`,
    booking.children > 0
      ? `${booking.children} child${booking.children === 1 ? "" : "ren"}`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="border border-ink-line bg-ink-soft">
      <div className="border-b border-ink-line p-6 text-center sm:p-10">
        <CheckCircle2
          className="mx-auto h-12 w-12 text-gold"
          strokeWidth={1.25}
        />
        <h1 className="mt-6 font-display text-3xl text-cream sm:text-4xl">
          Booking {statusInfo.label}
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-cream-dim">
          {statusInfo.note}
        </p>

        <div className="mx-auto mt-8 inline-block border border-gold/40 bg-gold/5 px-8 py-5">
          <p className="text-[11px] tracking-[0.3em] uppercase text-cream-muted">
            Booking Reference
          </p>
          <p className="mt-2 font-display text-2xl tracking-[0.15em] text-gold sm:text-3xl">
            {booking.booking_number}
          </p>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-cream-muted">
          Keep this reference safe. You will need it along with your email or
          mobile number to view this booking again.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 p-6 sm:p-10 lg:grid-cols-2">
        <section>
          <h2 className="text-xs tracking-[0.35em] uppercase text-gold">
            Stay Details
          </h2>
          <dl className="mt-5">
            <DetailRow label="Hotel" value={booking.hotel_name} />
            {booking.hotel_city && (
              <DetailRow label="City" value={booking.hotel_city} />
            )}
            <DetailRow label="Room" value={booking.room_type_name} />
            {booking.room_number && (
              <DetailRow label="Room Number" value={booking.room_number} />
            )}
            <DetailRow
              label="Check-in"
              value={
                <>
                  {formatStayDate(booking.check_in_date)}
                  {booking.check_in_time && (
                    <span className="text-cream-muted">
                      {" "}
                      · from {formatTimeOfDay(booking.check_in_time)}
                    </span>
                  )}
                </>
              }
            />
            <DetailRow
              label="Check-out"
              value={
                <>
                  {formatStayDate(booking.check_out_date)}
                  {booking.check_out_time && (
                    <span className="text-cream-muted">
                      {" "}
                      · by {formatTimeOfDay(booking.check_out_time)}
                    </span>
                  )}
                </>
              }
            />
            <DetailRow
              label="Nights"
              value={`${booking.nights} night${booking.nights === 1 ? "" : "s"}`}
            />
            <DetailRow label="Guests" value={guestLabel} />
            <DetailRow label="Rooms" value={booking.number_of_rooms} />
          </dl>
        </section>

        <section>
          <h2 className="text-xs tracking-[0.35em] uppercase text-gold">
            Guest &amp; Charges
          </h2>
          <dl className="mt-5">
            <DetailRow label="Booked by" value={booking.guest_name} />
            <DetailRow
              label="Amount"
              value={
                hasAmount
                  ? formatPrice(booking.total_amount, currency)
                  : "On request"
              }
            />
            <DetailRow
              label="Payment"
              value={PAYMENT_LABELS[booking.payment_status] || "—"}
            />
            {booking.special_requests && (
              <DetailRow
                label="Requests"
                value={
                  <span className="block max-w-xs text-left sm:text-right">
                    {booking.special_requests}
                  </span>
                }
              />
            )}
          </dl>

          <p className="mt-6 flex gap-3 border border-ink-line bg-ink p-4 text-xs leading-relaxed text-cream-muted">
            <CalendarCheck
              className="h-4 w-4 shrink-0 text-gold"
              strokeWidth={1.5}
            />
            {hasAmount
              ? "Amounts shown are indicative of the room charge. Taxes and any extras are applied at the property. No payment has been collected online."
              : "Rates for this stay will be shared by our team on confirmation. No payment has been collected online."}
          </p>
        </section>
      </div>

      <div className="flex flex-col gap-4 border-t border-ink-line p-6 sm:flex-row sm:items-center sm:justify-between sm:p-10">
        <Link
          href={`/hotels/${booking.hotel_slug}`}
          className={`${SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
        >
          View Hotel
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
        >
          <Printer className="h-4 w-4" strokeWidth={1.5} />
          Print
        </button>
      </div>
    </div>
  );
}
