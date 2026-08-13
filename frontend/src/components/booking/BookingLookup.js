"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarCheck,
  CheckCircle2,
  Loader2,
  Printer,
} from "lucide-react";
import {
  cancelBookingByNumber,
  getBookingAvailability,
  getBookingByNumber,
  modifyBookingByNumber,
  previewModifyBookingByNumber,
  updateNotificationPreferencesByNumber,
} from "@/lib/api";
import {
  recallBookingContact,
  rememberBookingContact,
} from "@/lib/bookingSession";
import { formatPrice, formatTimeOfDay } from "@/lib/format";
import { formatStayDate, nightsBetween } from "@/lib/bookingPricing";
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

function canGuestCancel(status) {
  return status === "pending" || status === "confirmed";
}

function canGuestModify(status) {
  return status === "pending" || status === "confirmed";
}

function stayFormFromBooking(booking) {
  return {
    check_in_date: booking?.check_in_date || "",
    check_out_date: booking?.check_out_date || "",
    room_type_id: "",
    number_of_rooms: String(booking?.number_of_rooms ?? 1),
  };
}

function prefsFormFromBooking(booking) {
  const prefs = booking?.notification_preferences || {};
  return {
    email_updates: prefs.email_updates !== false,
    sms_opt_in: Boolean(prefs.sms_opt_in),
    whatsapp_opt_in: Boolean(prefs.whatsapp_opt_in),
  };
}

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
  const [verifiedContact, setVerifiedContact] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState("");

  const [showModify, setShowModify] = useState(false);
  const [showModifyConfirm, setShowModifyConfirm] = useState(false);
  const [stayForm, setStayForm] = useState({
    check_in_date: "",
    check_out_date: "",
    room_type_id: "",
    number_of_rooms: "1",
  });
  const [roomTypeOptions, setRoomTypeOptions] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [modifying, setModifying] = useState(false);
  const [modifyMessage, setModifyMessage] = useState("");
  const [prefsForm, setPrefsForm] = useState({
    email_updates: true,
    sms_opt_in: false,
    whatsapp_opt_in: false,
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState("");

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

      const proof = {
        email: email || "",
        phone: phone || "",
      };
      setVerifiedContact(proof);
      rememberBookingContact(bookingNumber, proof);
      const data = result.data?.data || null;
      setBooking(data);
      setStayForm(stayFormFromBooking(data));
      setPrefsForm(prefsFormFromBooking(data));
      setPrefsMessage("");
      setShowCancelConfirm(false);
      setCancelMessage("");
      setShowModify(false);
      setShowModifyConfirm(false);
      setPreview(null);
      setModifyMessage("");
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

  useEffect(() => {
    let cancelled = false;

    async function loadRoomTypes() {
      if (!booking?.hotel_slug || !stayForm.check_in_date || !stayForm.check_out_date) {
        setRoomTypeOptions([]);
        return;
      }
      if (stayForm.check_out_date <= stayForm.check_in_date) {
        setRoomTypeOptions([]);
        return;
      }

      const result = await getBookingAvailability({
        hotelSlug: booking.hotel_slug,
        checkInDate: stayForm.check_in_date,
        checkOutDate: stayForm.check_out_date,
        numberOfRooms: Number(stayForm.number_of_rooms) || 1,
      });
      if (cancelled) return;

      if (!result.ok) {
        setRoomTypeOptions([]);
        return;
      }

      const types = result.data?.data?.room_types || [];
      setRoomTypeOptions(types);

      setStayForm((prev) => {
        if (prev.room_type_id) return prev;
        const match =
          types.find((rt) => rt.slug === booking.room_type_slug) || types[0];
        if (!match) return prev;
        return { ...prev, room_type_id: match.room_type_id };
      });
    }

    if (showModify) {
      loadRoomTypes();
    }

    return () => {
      cancelled = true;
    };
  }, [
    booking,
    showModify,
    stayForm.check_in_date,
    stayForm.check_out_date,
    stayForm.number_of_rooms,
  ]);

  useEffect(() => {
    setPreview(null);
  }, [
    stayForm.check_in_date,
    stayForm.check_out_date,
    stayForm.room_type_id,
    stayForm.number_of_rooms,
  ]);

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

  async function handleConfirmCancel() {
    if (!booking || !verifiedContact || cancelling) return;

    setCancelling(true);
    setCancelMessage("");
    const payload = {
      email: verifiedContact.email || undefined,
      phone: verifiedContact.phone || undefined,
    };
    const reason = cancelReason.trim();
    if (reason) payload.cancellation_reason = reason;

    const result = await cancelBookingByNumber(bookingNumber, payload);
    setCancelling(false);

    if (result.networkError) {
      setCancelMessage(
        "Unable to reach the server. Please check your connection and try again."
      );
      return;
    }

    if (!result.ok) {
      if (result.status === 404) {
        setCancelMessage(
          "We could not verify this booking with that contact detail."
        );
      } else if (result.status === 429) {
        setCancelMessage("Too many attempts. Please wait a moment and try again.");
      } else {
        setCancelMessage(
          result.data?.message ||
            "Unable to cancel this booking. Please contact the property."
        );
      }
      if (verifiedContact) {
        await load(verifiedContact);
      }
      return;
    }

    setBooking(result.data?.data || null);
    setShowCancelConfirm(false);
    setCancelReason("");
    setCancelMessage("");
    setShowModify(false);
  }

  function contactPayload() {
    return {
      email: verifiedContact?.email || undefined,
      phone: verifiedContact?.phone || undefined,
    };
  }

  async function handleSavePrefs() {
    if (!booking || !verifiedContact || savingPrefs) return;

    setSavingPrefs(true);
    setPrefsMessage("");
    const result = await updateNotificationPreferencesByNumber(bookingNumber, {
      ...contactPayload(),
      notification_preferences: {
        email_updates: Boolean(prefsForm.email_updates),
        sms_opt_in: Boolean(prefsForm.sms_opt_in),
        whatsapp_opt_in: Boolean(prefsForm.whatsapp_opt_in),
      },
    });
    setSavingPrefs(false);

    if (result.networkError) {
      setPrefsMessage(
        "Unable to reach the server. Please check your connection and try again."
      );
      return;
    }

    if (!result.ok) {
      if (result.status === 404) {
        setPrefsMessage(
          "We could not verify this booking. Please refresh and try again."
        );
      } else if (result.status === 429) {
        setPrefsMessage("Too many attempts. Please wait a moment and try again.");
      } else {
        setPrefsMessage(
          result.data?.message ||
            result.data?.errors?.[0] ||
            "Unable to save preferences. Please try again."
        );
      }
      return;
    }

    const data = result.data?.data || null;
    setBooking(data);
    setPrefsForm(prefsFormFromBooking(data));
    setPrefsMessage("Communication preferences saved.");
  }

  function validateStayLocal() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(stayForm.check_in_date)) {
      return "Enter a valid check-in date.";
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(stayForm.check_out_date)) {
      return "Enter a valid check-out date.";
    }
    if (stayForm.check_out_date <= stayForm.check_in_date) {
      return "Check-out must be after check-in.";
    }
    if (!stayForm.room_type_id) {
      return "Select a room type.";
    }
    const rooms = Number(stayForm.number_of_rooms);
    if (!Number.isInteger(rooms) || rooms < 1 || rooms > 20) {
      return "Rooms must be between 1 and 20.";
    }
    return null;
  }

  const stayDirty = useMemo(() => {
    if (!booking) return false;
    const rooms = Number(stayForm.number_of_rooms);
    const selected = roomTypeOptions.find(
      (rt) => rt.room_type_id === stayForm.room_type_id
    );
    const typeChanged = selected
      ? selected.slug !== booking.room_type_slug
      : Boolean(stayForm.room_type_id);
    return (
      stayForm.check_in_date !== booking.check_in_date ||
      stayForm.check_out_date !== booking.check_out_date ||
      rooms !== Number(booking.number_of_rooms) ||
      typeChanged
    );
  }, [booking, stayForm, roomTypeOptions]);

  async function handlePreviewModify() {
    if (!booking || !verifiedContact || previewLoading) return;
    const localError = validateStayLocal();
    if (localError) {
      setModifyMessage(localError);
      setPreview(null);
      return;
    }

    setPreviewLoading(true);
    setModifyMessage("");
    const result = await previewModifyBookingByNumber(bookingNumber, {
      ...contactPayload(),
      check_in_date: stayForm.check_in_date,
      check_out_date: stayForm.check_out_date,
      room_type_id: stayForm.room_type_id,
      number_of_rooms: Number(stayForm.number_of_rooms),
    });
    setPreviewLoading(false);

    if (result.networkError) {
      setModifyMessage(
        "Unable to reach the server. Please check your connection and try again."
      );
      return;
    }

    if (!result.ok) {
      setModifyMessage(
        result.data?.message ||
          "Unable to check availability for the revised stay."
      );
      setPreview(null);
      return;
    }

    setPreview(result.data?.data || null);
  }

  function requestModifyConfirm() {
    const localError = validateStayLocal();
    if (localError) {
      setModifyMessage(localError);
      return;
    }
    if (!stayDirty) {
      setModifyMessage("No stay changes to save.");
      return;
    }
    if (preview && preview.is_available === false) {
      setModifyMessage(
        preview.stop_sell
          ? "This room type is on stop-sell for the selected dates."
          : "Not enough rooms are available for the revised stay."
      );
      return;
    }
    setShowModifyConfirm(true);
    setModifyMessage("");
  }

  async function handleConfirmModify() {
    if (!booking || !verifiedContact || modifying) return;

    setModifying(true);
    setModifyMessage("");
    const result = await modifyBookingByNumber(bookingNumber, {
      ...contactPayload(),
      check_in_date: stayForm.check_in_date,
      check_out_date: stayForm.check_out_date,
      room_type_id: stayForm.room_type_id,
      number_of_rooms: Number(stayForm.number_of_rooms),
    });
    setModifying(false);

    if (result.networkError) {
      setModifyMessage(
        "Unable to reach the server. Please check your connection and try again."
      );
      return;
    }

    if (!result.ok) {
      setModifyMessage(
        result.data?.message ||
          "Unable to update this stay. Please try different dates or contact the property."
      );
      if (verifiedContact) {
        await load(verifiedContact);
      }
      return;
    }

    setBooking(result.data?.data || null);
    setStayForm(stayFormFromBooking(result.data?.data || null));
    setShowModify(false);
    setShowModifyConfirm(false);
    setPreview(null);
    setModifyMessage("");
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
  const guestCanCancel = canGuestCancel(booking.booking_status);
  const guestCanModifyStay = canGuestModify(booking.booking_status);
  const reviseNights = nightsBetween(
    stayForm.check_in_date,
    stayForm.check_out_date
  );

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
            {booking.booking_status === "cancelled" &&
              booking.cancellation_reason && (
                <DetailRow
                  label="Cancel reason"
                  value={
                    <span className="block max-w-xs text-left sm:text-right">
                      {booking.cancellation_reason}
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

      <div className="border-t border-ink-line p-6 sm:p-10">
        <h2 className="text-xs tracking-[0.35em] uppercase text-gold">
          Communication preferences
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-cream-dim">
          Confirmation and cancellation emails always send to the address on this
          booking. Use the options below for optional status and stay updates.
        </p>
        <div className="mt-5 space-y-3">
          <label className="flex items-start gap-3 text-sm text-cream-dim">
            <input
              type="checkbox"
              checked={Boolean(prefsForm.email_updates)}
              onChange={(event) =>
                setPrefsForm((prev) => ({
                  ...prev,
                  email_updates: event.target.checked,
                }))
              }
              className="mt-0.5 h-4 w-4 accent-gold"
            />
            <span>Email me about booking status and stay changes</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-cream-dim">
            <input
              type="checkbox"
              checked={Boolean(prefsForm.sms_opt_in)}
              onChange={(event) =>
                setPrefsForm((prev) => ({
                  ...prev,
                  sms_opt_in: event.target.checked,
                }))
              }
              className="mt-0.5 h-4 w-4 accent-gold"
            />
            <span>SMS updates (coming soon)</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-cream-dim">
            <input
              type="checkbox"
              checked={Boolean(prefsForm.whatsapp_opt_in)}
              onChange={(event) =>
                setPrefsForm((prev) => ({
                  ...prev,
                  whatsapp_opt_in: event.target.checked,
                }))
              }
              className="mt-0.5 h-4 w-4 accent-gold"
            />
            <span>WhatsApp updates (coming soon)</span>
          </label>
        </div>
        {prefsMessage && (
          <p
            className={`mt-4 text-sm ${
              prefsMessage.includes("saved") ? "text-cream-dim" : "text-gold"
            }`}
          >
            {prefsMessage}
          </p>
        )}
        <button
          type="button"
          onClick={handleSavePrefs}
          disabled={savingPrefs}
          className={`${SECONDARY_BUTTON_CLASS} mt-5 w-full sm:w-auto`}
        >
          {savingPrefs ? "Saving…" : "Save preferences"}
        </button>
      </div>

      {guestCanModifyStay && (
        <div className="border-t border-ink-line p-6 sm:p-10">
          {!showModify ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-cream-dim">
                Need different dates or a different room type? You can update
                this reservation online before check-in.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowModify(true);
                  setShowCancelConfirm(false);
                  setStayForm(stayFormFromBooking(booking));
                  setPreview(null);
                  setModifyMessage("");
                  setShowModifyConfirm(false);
                }}
                className={`${SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
              >
                Change stay
              </button>
            </div>
          ) : (
            <div className="border border-ink-line bg-ink p-5 sm:p-6">
              <h2 className="font-display text-2xl text-cream">
                Change your stay
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                Availability is re-checked for the full revised stay. Pricing is
                recalculated from the room type rate — guest-entered totals are
                never used.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="bk-mod-in" className={LABEL_CLASS}>
                    Check-in
                  </label>
                  <input
                    id="bk-mod-in"
                    type="date"
                    value={stayForm.check_in_date}
                    disabled={modifying}
                    onChange={(e) =>
                      setStayForm((prev) => ({
                        ...prev,
                        check_in_date: e.target.value,
                      }))
                    }
                    className={inputClass(false)}
                  />
                </div>
                <div>
                  <label htmlFor="bk-mod-out" className={LABEL_CLASS}>
                    Check-out
                  </label>
                  <input
                    id="bk-mod-out"
                    type="date"
                    value={stayForm.check_out_date}
                    disabled={modifying}
                    onChange={(e) =>
                      setStayForm((prev) => ({
                        ...prev,
                        check_out_date: e.target.value,
                      }))
                    }
                    className={inputClass(false)}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="bk-mod-type" className={LABEL_CLASS}>
                  Room type
                </label>
                <select
                  id="bk-mod-type"
                  value={stayForm.room_type_id}
                  disabled={modifying}
                  onChange={(e) =>
                    setStayForm((prev) => ({
                      ...prev,
                      room_type_id: e.target.value,
                    }))
                  }
                  className={inputClass(false)}
                >
                  <option value="">Select room type</option>
                  {roomTypeOptions.map((rt) => (
                    <option key={rt.room_type_id} value={rt.room_type_id}>
                      {rt.name}
                      {rt.is_available === false ? " (limited)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 max-w-xs">
                <label htmlFor="bk-mod-rooms" className={LABEL_CLASS}>
                  Rooms
                </label>
                <input
                  id="bk-mod-rooms"
                  type="number"
                  min={1}
                  max={20}
                  value={stayForm.number_of_rooms}
                  disabled={modifying}
                  onChange={(e) =>
                    setStayForm((prev) => ({
                      ...prev,
                      number_of_rooms: e.target.value,
                    }))
                  }
                  className={inputClass(false)}
                />
              </div>

              <p className="mt-4 text-xs text-cream-muted">
                Revised stay:{" "}
                {reviseNights > 0
                  ? `${reviseNights} night${reviseNights === 1 ? "" : "s"}`
                  : "invalid dates"}
                {preview
                  ? ` · ${
                      preview.on_request
                        ? "Price on request"
                        : formatPrice(preview.total_amount, preview.currency || currency)
                    }`
                  : ""}
              </p>

              {preview && (
                <p
                  role="status"
                  className={`mt-3 text-sm ${
                    preview.is_available ? "text-cream-dim" : "text-gold"
                  }`}
                >
                  {preview.is_available
                    ? `${preview.available_rooms} room(s) available for these dates (your current booking is excluded from the count).`
                    : preview.stop_sell
                      ? "Stop-sell is active for at least one night in this stay."
                      : `Only ${preview.available_rooms} room(s) available — need ${preview.number_of_rooms}.`}
                </p>
              )}

              {modifyMessage && (
                <div
                  role="alert"
                  className="mt-4 flex gap-3 border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
                >
                  <AlertCircle
                    className="h-5 w-5 flex-shrink-0 text-gold"
                    strokeWidth={1.5}
                  />
                  <p>{modifyMessage}</p>
                </div>
              )}

              {!showModifyConfirm ? (
                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={modifying || previewLoading}
                    onClick={() => {
                      setShowModify(false);
                      setStayForm(stayFormFromBooking(booking));
                      setPreview(null);
                      setModifyMessage("");
                    }}
                    className={`${SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={modifying || previewLoading}
                    onClick={handlePreviewModify}
                    className={`${SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
                  >
                    {previewLoading && (
                      <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                    )}
                    {previewLoading ? "Checking…" : "Check availability"}
                  </button>
                  <button
                    type="button"
                    disabled={modifying || previewLoading || !stayDirty}
                    onClick={requestModifyConfirm}
                    className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
                  >
                    Review &amp; save
                  </button>
                </div>
              ) : (
                <div className="mt-6 border border-ink-line bg-ink-soft p-4">
                  <h3 className="font-display text-xl text-cream">
                    Confirm stay change
                  </h3>
                  <p className="mt-2 text-sm text-cream-dim">
                    Update booking{" "}
                    <span className="text-gold">{booking.booking_number}</span>{" "}
                    to {formatStayDate(stayForm.check_in_date)} →{" "}
                    {formatStayDate(stayForm.check_out_date)}
                    {preview?.room_type_name
                      ? ` · ${preview.room_type_name}`
                      : ""}
                    {` · ${stayForm.number_of_rooms} room(s)`}
                    {preview && !preview.on_request
                      ? ` · ${formatPrice(
                          preview.total_amount,
                          preview.currency || currency
                        )}`
                      : ""}
                    ?
                  </p>
                  <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      disabled={modifying}
                      onClick={() => setShowModifyConfirm(false)}
                      className={`${SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={modifying}
                      onClick={handleConfirmModify}
                      className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
                    >
                      {modifying && (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          strokeWidth={2}
                        />
                      )}
                      {modifying ? "Saving…" : "Confirm changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {guestCanCancel && (
        <div className="border-t border-ink-line p-6 sm:p-10">
          {!showCancelConfirm ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-cream-dim">
                Need to cancel? You can cancel this reservation online before
                check-in.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowCancelConfirm(true);
                  setCancelMessage("");
                  setShowModify(false);
                }}
                className={`${SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
              >
                Cancel booking
              </button>
            </div>
          ) : (
            <div className="border border-ink-line bg-ink p-5 sm:p-6">
              <h2 className="font-display text-2xl text-cream">
                Confirm cancellation
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-cream-dim">
                Cancel booking{" "}
                <span className="text-gold">{booking.booking_number}</span>?
                This cannot be undone online. Contact the property if you need
                help afterwards.
              </p>

              <label htmlFor="bk-cancel-reason" className={`${LABEL_CLASS} mt-6`}>
                Reason{" "}
                <span className="normal-case tracking-normal text-cream-muted">
                  (optional)
                </span>
              </label>
              <textarea
                id="bk-cancel-reason"
                rows={3}
                maxLength={2000}
                value={cancelReason}
                onChange={(event) => setCancelReason(event.target.value)}
                className={inputClass(false)}
                placeholder="Optional note for the property"
              />

              {cancelMessage && (
                <div
                  role="alert"
                  className="mt-4 flex gap-3 border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
                >
                  <AlertCircle
                    className="h-5 w-5 flex-shrink-0 text-gold"
                    strokeWidth={1.5}
                  />
                  <p>{cancelMessage}</p>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={() => {
                    setShowCancelConfirm(false);
                    setCancelReason("");
                    setCancelMessage("");
                  }}
                  className={`${SECONDARY_BUTTON_CLASS} w-full sm:w-auto`}
                >
                  Keep booking
                </button>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleConfirmCancel}
                  className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
                >
                  {cancelling && (
                    <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  )}
                  {cancelling ? "Cancelling…" : "Confirm cancellation"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
