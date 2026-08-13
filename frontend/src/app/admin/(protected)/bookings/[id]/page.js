"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  assignAdminBookingRoom,
  cancelAdminBooking,
  canCancelBooking,
  canModifyStayBooking,
  formatApiError,
  getAdminBooking,
  nextBookingActions,
  updateAdminBooking,
  updateAdminBookingStatus,
} from "@/lib/adminBookings";
import { getAdminInventoryOverlaps } from "@/lib/adminInventory";
import { listAdminRoomTypes } from "@/lib/adminRoomTypes";
import { listAdminRooms } from "@/lib/adminRooms";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";
import { calculateStayTotals, nightsBetween } from "@/lib/bookingPricing";
import { formatPrice } from "@/lib/format";

function Row({ label, value }) {
  return (
    <div className="border-t border-ink-line py-4 sm:grid sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-cream sm:mt-0">{value || "—"}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="border border-ink-line bg-ink-soft p-5 sm:p-6">
      <h2 className="text-[11px] tracking-[0.25em] uppercase text-gold">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function formatDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTimeline(booking) {
  const events = [];
  if (booking.created_at) {
    events.push({
      at: booking.created_at,
      label: "Booking created",
      detail: booking.created_by_admin_name
        ? `By ${booking.created_by_admin_name} (${booking.booking_source})`
        : `Source: ${(booking.booking_source || "").replace(/_/g, " ")}`,
    });
  }
  if (booking.confirmed_at) {
    events.push({
      at: booking.confirmed_at,
      label: "Confirmed",
      detail: "Reservation confirmed",
    });
  }
  if (booking.cancelled_at) {
    events.push({
      at: booking.cancelled_at,
      label:
        booking.booking_status === "no_show" ? "Marked no show" : "Cancelled",
      detail: booking.cancellation_reason || null,
    });
  }
  if (
    booking.updated_at &&
    booking.created_at &&
    booking.updated_at !== booking.created_at
  ) {
    events.push({
      at: booking.updated_at,
      label: "Last updated",
      detail: `Current status: ${(booking.booking_status || "").replace(/_/g, " ")}`,
    });
  }
  return events.sort((a, b) => new Date(a.at) - new Date(b.at));
}

function stayFormFromBooking(booking) {
  return {
    check_in_date: booking?.check_in_date || "",
    check_out_date: booking?.check_out_date || "",
    room_type_id: booking?.room_type_id || "",
    number_of_rooms: String(booking?.number_of_rooms ?? 1),
  };
}

export default function AdminBookingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [booking, setBooking] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [pendingAction, setPendingAction] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [guestRequests, setGuestRequests] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [prefsForm, setPrefsForm] = useState({
    email_updates: true,
    sms_opt_in: false,
    whatsapp_opt_in: false,
  });

  const [stayForm, setStayForm] = useState({
    check_in_date: "",
    check_out_date: "",
    room_type_id: "",
    number_of_rooms: "1",
  });
  const [stayAvailability, setStayAvailability] = useState(null);
  const [stayAvailabilityLoading, setStayAvailabilityLoading] = useState(false);
  const [confirmStaySave, setConfirmStaySave] = useState(false);

  const applyBookingState = useCallback((data) => {
    setBooking(data);
    setGuestRequests(data?.special_requests || "");
    setInternalNotes(data?.admin_notes || "");
    setSelectedRoomId(data?.room_id || "");
    const prefs = data?.notification_preferences || {};
    setPrefsForm({
      email_updates: prefs.email_updates !== false,
      sms_opt_in: Boolean(prefs.sms_opt_in),
      whatsapp_opt_in: Boolean(prefs.whatsapp_opt_in),
    });
    setStayForm(stayFormFromBooking(data));
    setStayAvailability(null);
    setConfirmStaySave(false);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminBooking(id);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      setError(result.data?.message || "Booking not found.");
      setBooking(null);
      setLoading(false);
      return;
    }

    const data = result.data?.data || null;
    applyBookingState(data);
    setError("");
    setLoading(false);

    if (data?.hotel_id) {
      const [roomsResult, typesResult] = await Promise.all([
        data.room_type_id
          ? listAdminRooms({
              hotel_id: data.hotel_id,
              room_type_id: data.room_type_id,
            })
          : Promise.resolve({ ok: true, data: { data: [] } }),
        listAdminRoomTypes({ hotel_id: data.hotel_id }),
      ]);
      if (roomsResult.ok) {
        setRooms(resultRooms(roomsResult.data?.data));
      }
      if (typesResult.ok) {
        setRoomTypes(
          (typesResult.data?.data || []).filter((rt) => rt.status !== "archived")
        );
      }
    }
  }, [applyBookingState, id, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setStayAvailability(null);
  }, [
    stayForm.check_in_date,
    stayForm.check_out_date,
    stayForm.room_type_id,
    stayForm.number_of_rooms,
  ]);

  const actions = useMemo(
    () =>
      booking
        ? nextBookingActions(booking.booking_status).filter(
            (action) => action.value !== "cancelled"
          )
        : [],
    [booking]
  );
  const showCancelAction = Boolean(
    booking && canCancelBooking(booking.booking_status)
  );
  const canEditStay = Boolean(
    booking && canModifyStayBooking(booking.booking_status)
  );
  const timeline = useMemo(
    () => (booking ? buildTimeline(booking) : []),
    [booking]
  );
  const nights = booking
    ? nightsBetween(booking.check_in_date, booking.check_out_date)
    : 0;
  const stayNights = nightsBetween(
    stayForm.check_in_date,
    stayForm.check_out_date
  );
  const selectedStayRoomType = useMemo(
    () => roomTypes.find((rt) => rt.id === stayForm.room_type_id) || null,
    [roomTypes, stayForm.room_type_id]
  );
  const proposedPricing = useMemo(() => {
    return calculateStayTotals({
      basePrice: selectedStayRoomType?.base_price,
      nights: stayNights,
      rooms: Number(stayForm.number_of_rooms) || 0,
    });
  }, [selectedStayRoomType, stayNights, stayForm.number_of_rooms]);

  const stayDirty = Boolean(
    booking &&
      (stayForm.check_in_date !== booking.check_in_date ||
        stayForm.check_out_date !== booking.check_out_date ||
        stayForm.room_type_id !== booking.room_type_id ||
        Number(stayForm.number_of_rooms) !== Number(booking.number_of_rooms))
  );

  const canAssignRoom =
    booking &&
    booking.number_of_rooms === 1 &&
    !["cancelled", "no_show"].includes(booking.booking_status);

  async function applyStatus(nextStatus, reason) {
    if (!booking || busy) return;
    setBusy(true);
    const payload = { booking_status: nextStatus };
    if (reason) payload.cancellation_reason = reason;

    const result = await updateAdminBookingStatus(booking.id, payload);
    setBusy(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Status update failed."));
      return;
    }

    applyBookingState(result.data?.data || null);
    setPendingAction(null);
    setCancelReason("");
    toast.success(`Booking marked as ${nextStatus.replace(/_/g, " ")}.`);
  }

  async function confirmCancelBooking() {
    if (!booking || busy) return;
    setBusy(true);
    const payload = {};
    const reason = cancelReason.trim();
    if (reason) payload.cancellation_reason = reason;

    const result = await cancelAdminBooking(booking.id, payload);
    setBusy(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to cancel booking."));
      return;
    }

    applyBookingState(result.data?.data || null);
    setPendingAction(null);
    setCancelReason("");
    toast.success("Booking cancelled.");
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    if (pendingAction.value === "cancelled") {
      await confirmCancelBooking();
      return;
    }
    if (pendingAction.value === "no_show" && !cancelReason.trim()) {
      toast.error("Please add a no-show reason.");
      return;
    }
    await applyStatus(pendingAction.value, cancelReason.trim() || undefined);
  }

  async function saveGuestRequests() {
    if (!booking || busy) return;
    setBusy(true);
    const result = await updateAdminBooking(booking.id, {
      special_requests: guestRequests.trim() || null,
    });
    setBusy(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to save guest requests."));
      return;
    }

    applyBookingState(result.data?.data || null);
    toast.success("Guest special requests saved.");
  }

  async function saveNotificationPrefs() {
    if (!booking || busy) return;
    setBusy(true);
    const result = await updateAdminBooking(booking.id, {
      notification_preferences: {
        email_updates: Boolean(prefsForm.email_updates),
        sms_opt_in: Boolean(prefsForm.sms_opt_in),
        whatsapp_opt_in: Boolean(prefsForm.whatsapp_opt_in),
      },
    });
    setBusy(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(
        formatApiError(result, "Unable to save notification preferences.")
      );
      return;
    }

    applyBookingState(result.data?.data || null);
    toast.success("Notification preferences saved.");
  }

  async function saveInternalNotes() {
    if (!booking || busy) return;
    setBusy(true);
    const result = await updateAdminBooking(booking.id, {
      admin_notes: internalNotes.trim() || null,
    });
    setBusy(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to save internal notes."));
      return;
    }

    applyBookingState(result.data?.data || null);
    toast.success("Internal notes saved.");
  }

  async function saveRoomAssignment() {
    if (!booking || busy) return;
    setBusy(true);
    const result = await assignAdminBookingRoom(
      booking.id,
      selectedRoomId || null
    );
    setBusy(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Room assignment failed."));
      return;
    }

    applyBookingState(result.data?.data || null);
    toast.success(result.data?.message || "Room assignment updated.");
  }

  function validateStayFormLocal() {
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
    const roomsCount = Number(stayForm.number_of_rooms);
    if (!Number.isInteger(roomsCount) || roomsCount < 1 || roomsCount > 20) {
      return "Rooms must be between 1 and 20.";
    }
    return null;
  }

  async function checkStayAvailability() {
    if (!booking || busy) return;
    const localError = validateStayFormLocal();
    if (localError) {
      setStayAvailability({ ok: false, available: false, message: localError });
      return;
    }

    setStayAvailabilityLoading(true);
    setStayAvailability(null);

    const result = await getAdminInventoryOverlaps({
      hotel_id: booking.hotel_id,
      room_type_id: stayForm.room_type_id,
      check_in_date: stayForm.check_in_date,
      check_out_date: stayForm.check_out_date,
      exclude_booking_id: booking.id,
    });

    setStayAvailabilityLoading(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      setStayAvailability({
        ok: false,
        available: false,
        message: formatApiError(result, "Unable to check availability."),
      });
      return;
    }

    const inventory = result.data?.data?.inventory || {};
    const requested = Number(stayForm.number_of_rooms) || 1;
    const available = Number(inventory.available_rooms) || 0;
    const stopSell = Boolean(inventory.stop_sell);
    const enough = !stopSell && available >= requested;

    setStayAvailability({
      ok: true,
      available: enough,
      stopSell,
      availableRooms: available,
      bookedRooms: Number(inventory.booked_rooms) || 0,
      totalRooms: Number(inventory.total_rooms) || 0,
      message: stopSell
        ? "Stop-sell is active for at least one night in this stay."
        : enough
          ? `${available} room(s) available for the revised stay (this booking excluded from sold counts).`
          : `Only ${available} room(s) available — need ${requested}.`,
    });
  }

  function requestStaySave() {
    if (!booking || busy || !canEditStay) return;
    const localError = validateStayFormLocal();
    if (localError) {
      toast.error(localError);
      return;
    }
    if (!stayDirty) {
      toast.error("No stay changes to save.");
      return;
    }
    setConfirmStaySave(true);
  }

  async function confirmStaySaveAction() {
    if (!booking || busy || !canEditStay) return;
    setBusy(true);
    const result = await updateAdminBooking(booking.id, {
      check_in_date: stayForm.check_in_date,
      check_out_date: stayForm.check_out_date,
      room_type_id: stayForm.room_type_id,
      number_of_rooms: Number(stayForm.number_of_rooms),
    });
    setBusy(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to update stay."));
      return;
    }

    const data = result.data?.data || null;
    applyBookingState(data);

    if (data?.hotel_id && data?.room_type_id) {
      const roomsResult = await listAdminRooms({
        hotel_id: data.hotel_id,
        room_type_id: data.room_type_id,
      });
      if (roomsResult.ok) {
        setRooms(resultRooms(roomsResult.data?.data));
      }
    }

    toast.success("Stay updated. Pricing recalculated from base price.");
  }

  if (loading) {
    return (
      <p className="inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
        <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
        Loading…
      </p>
    );
  }

  if (error || !booking) {
    return (
      <div>
        <Link
          href="/admin/bookings"
          className="text-[11px] tracking-[0.22em] uppercase text-cream-muted hover:text-gold"
        >
          ← Bookings
        </Link>
        <p role="alert" className="mt-6 text-sm text-gold">
          {error || "Booking not found."}
        </p>
      </div>
    );
  }

  const currency = booking.currency || "INR";
  const inputClass =
    "mt-2 w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none disabled:opacity-60";

  return (
    <div>
      <Link
        href="/admin/bookings"
        className="text-[11px] tracking-[0.22em] uppercase text-cream-muted hover:text-gold"
      >
        ← Bookings
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Booking detail
          </span>
          <div className="gold-divider mt-5" />
          <h1 className="mt-6 font-display text-3xl text-cream sm:text-4xl">
            {booking.booking_number}
          </h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status={booking.booking_status} />
            <StatusBadge status={booking.payment_status} />
          </div>
        </div>
      </div>

      {(actions.length > 0 || showCancelAction) && (
        <div className="mt-8 flex flex-wrap gap-2 border border-ink-line bg-ink-soft p-4">
          {actions.map((action) => (
            <button
              key={action.value}
              type="button"
              disabled={busy}
              onClick={() => {
                setPendingAction(action);
                setCancelReason(booking.cancellation_reason || "");
              }}
              className="border border-cream/30 px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase text-cream transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
            >
              {action.label}
            </button>
          ))}
          {showCancelAction && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setPendingAction({
                  value: "cancelled",
                  label: "Cancel booking",
                });
                setCancelReason(booking.cancellation_reason || "");
              }}
              className="border border-gold/50 px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase text-gold transition-colors hover:border-gold hover:bg-gold/10 disabled:opacity-50"
            >
              Cancel booking
            </button>
          )}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title="Guest information">
          <dl>
            <Row label="Name" value={booking.guest_name} />
            <Row label="Email" value={booking.guest_email} />
            <Row label="Phone" value={booking.guest_phone} />
            <Row
              label="Source"
              value={(booking.booking_source || "").replace(/_/g, " ")}
            />
          </dl>
        </Section>

        <Section title="Stay details">
          <dl>
            <Row label="Hotel" value={booking.hotel_name} />
            <Row
              label="Guests"
              value={`${booking.adults} adult${booking.adults === 1 ? "" : "s"}${
                booking.children
                  ? `, ${booking.children} child${
                      booking.children === 1 ? "" : "ren"
                    }`
                  : ""
              }`}
            />
          </dl>

          {canEditStay ? (
            <div className="mt-4 space-y-4 border-t border-ink-line pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                    Check-in
                  </label>
                  <input
                    type="date"
                    value={stayForm.check_in_date}
                    disabled={busy}
                    onChange={(e) =>
                      setStayForm((prev) => ({
                        ...prev,
                        check_in_date: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                    Check-out
                  </label>
                  <input
                    type="date"
                    value={stayForm.check_out_date}
                    disabled={busy}
                    onChange={(e) =>
                      setStayForm((prev) => ({
                        ...prev,
                        check_out_date: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                  Room type
                </label>
                <select
                  value={stayForm.room_type_id}
                  disabled={busy}
                  onChange={(e) =>
                    setStayForm((prev) => ({
                      ...prev,
                      room_type_id: e.target.value,
                    }))
                  }
                  className={inputClass}
                >
                  <option value="">Select room type</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name}
                      {rt.status && rt.status !== "active"
                        ? ` (${rt.status})`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                  Rooms requested
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={stayForm.number_of_rooms}
                  disabled={busy}
                  onChange={(e) =>
                    setStayForm((prev) => ({
                      ...prev,
                      number_of_rooms: e.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </div>

              <p className="text-xs text-cream-muted">
                Revised stay:{" "}
                {stayNights > 0 ? `${stayNights} night(s)` : "invalid dates"}
                {" · "}
                {proposedPricing.onRequest
                  ? "Price on request"
                  : `Indicative total ${formatPrice(proposedPricing.total, currency)}`}{" "}
                (server recalculates on save from base price).
              </p>

              {stayAvailability && (
                <p
                  role="status"
                  className={`text-sm ${
                    stayAvailability.available ? "text-cream" : "text-gold"
                  }`}
                >
                  {stayAvailability.message}
                  {stayAvailability.ok && (
                    <span className="mt-1 block text-xs text-cream-muted">
                      Peak sold {stayAvailability.bookedRooms} /{" "}
                      {stayAvailability.totalRooms} capacity
                      {stayAvailability.stopSell ? " · stop-sell" : ""}
                    </span>
                  )}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || stayAvailabilityLoading}
                  onClick={checkStayAvailability}
                  className="inline-flex items-center justify-center border border-cream/30 px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase text-cream hover:border-gold hover:text-gold disabled:opacity-50"
                >
                  {stayAvailabilityLoading ? "Checking…" : "Check availability"}
                </button>
                <button
                  type="button"
                  disabled={busy || !stayDirty}
                  onClick={requestStaySave}
                  className="inline-flex items-center justify-center bg-gold px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase text-cream hover:bg-gold-soft disabled:opacity-50"
                >
                  Save stay changes
                </button>
                {stayDirty && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setStayForm(stayFormFromBooking(booking));
                      setStayAvailability(null);
                    }}
                    className="inline-flex items-center justify-center border border-cream/20 px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase text-cream-muted hover:text-cream disabled:opacity-50"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          ) : (
            <dl>
              <Row label="Check-in" value={booking.check_in_date} />
              <Row label="Check-out" value={booking.check_out_date} />
              <Row label="Nights" value={nights > 0 ? String(nights) : "—"} />
              <Row label="Room type" value={booking.room_type_name} />
              <Row
                label="Rooms requested"
                value={String(booking.number_of_rooms)}
              />
              <p className="mt-4 text-xs text-cream-muted">
                Stay dates and room type cannot be changed on a{" "}
                {(booking.booking_status || "").replace(/_/g, " ")} booking.
              </p>
            </dl>
          )}
        </Section>

        <Section title="Room details">
          <dl>
            <Row label="Room type" value={booking.room_type_name} />
            <Row
              label="Assigned room"
              value={
                booking.room_number
                  ? `Room ${booking.room_number}`
                  : "Unassigned"
              }
            />
          </dl>
          {canAssignRoom && (
            <div className="mt-4 flex flex-col gap-3 border-t border-ink-line pt-4 sm:flex-row sm:items-center">
              <select
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
                className="w-full flex-1 bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
              >
                <option value="">Unassigned</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.room_number}
                    {room.status ? ` (${room.status})` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={saveRoomAssignment}
                className="inline-flex items-center justify-center bg-gold px-5 py-3 text-[11px] tracking-[0.2em] uppercase text-cream hover:bg-gold-soft disabled:opacity-50"
              >
                Save room
              </button>
            </div>
          )}
          {!canAssignRoom && booking.number_of_rooms > 1 && (
            <p className="mt-4 text-xs text-cream-muted">
              Physical room assignment is only available for single-room
              reservations.
            </p>
          )}
        </Section>

        <Section title="Pricing breakdown">
          <dl>
            <Row
              label="Subtotal"
              value={
                Number(booking.subtotal) > 0
                  ? formatPrice(booking.subtotal, currency)
                  : "On request"
              }
            />
            <Row
              label="Taxes / fees"
              value={
                Number(booking.tax_amount) > 0
                  ? formatPrice(booking.tax_amount, currency)
                  : "—"
              }
            />
            <Row
              label="Total"
              value={
                Number(booking.total_amount) > 0
                  ? formatPrice(booking.total_amount, currency)
                  : "On request"
              }
            />
            <Row label="Currency" value={currency} />
            <Row
              label="Payment"
              value={(booking.payment_status || "").replace(/_/g, " ")}
            />
          </dl>
        </Section>

        <Section title="Notification preferences">
          <p className="text-xs leading-relaxed text-cream-muted">
            Confirm and cancel emails always send when a guest email is present.
            These controls only affect optional status / stay-update emails.
            SMS and WhatsApp are stored preferences only (no providers yet).
          </p>
          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 text-sm text-cream-dim">
              <input
                type="checkbox"
                checked={Boolean(prefsForm.email_updates)}
                onChange={(e) =>
                  setPrefsForm((prev) => ({
                    ...prev,
                    email_updates: e.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 accent-gold"
              />
              <span>Email status / stay updates</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-cream-dim">
              <input
                type="checkbox"
                checked={Boolean(prefsForm.sms_opt_in)}
                onChange={(e) =>
                  setPrefsForm((prev) => ({
                    ...prev,
                    sms_opt_in: e.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 accent-gold"
              />
              <span>SMS opt-in (coming soon)</span>
            </label>
            <label className="flex items-start gap-3 text-sm text-cream-dim">
              <input
                type="checkbox"
                checked={Boolean(prefsForm.whatsapp_opt_in)}
                onChange={(e) =>
                  setPrefsForm((prev) => ({
                    ...prev,
                    whatsapp_opt_in: e.target.checked,
                  }))
                }
                className="mt-0.5 h-4 w-4 accent-gold"
              />
              <span>WhatsApp opt-in (coming soon)</span>
            </label>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={saveNotificationPrefs}
            className="mt-4 inline-flex items-center justify-center border border-cream/30 px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase text-cream hover:border-gold hover:text-gold disabled:opacity-50"
          >
            Save preferences
          </button>
        </Section>

        <Section title="Guest special requests">
          <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
            Guest-visible requests
          </label>
          <textarea
            rows={4}
            value={guestRequests}
            onChange={(e) => setGuestRequests(e.target.value)}
            maxLength={2000}
            className="mt-2 w-full resize-y bg-ink border border-ink-line px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:border-gold focus:outline-none"
            placeholder="Guest preferences or operational requests for this stay."
          />
          {booking.cancellation_reason && (
            <p className="mt-3 text-sm text-cream-dim">
              <span className="text-[10px] tracking-[0.2em] uppercase text-cream-muted">
                Cancellation / no-show reason:{" "}
              </span>
              {booking.cancellation_reason}
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={saveGuestRequests}
            className="mt-4 inline-flex items-center justify-center border border-cream/30 px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase text-cream hover:border-gold hover:text-gold disabled:opacity-50"
          >
            Save guest requests
          </button>
          <p className="mt-3 text-xs leading-relaxed text-cream-muted">
            Stored on special_requests and shown on guest booking lookup.
          </p>
        </Section>

        <Section title="Internal notes">
          <p className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
            Private — visible to hotel staff only
          </p>
          <textarea
            rows={4}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            maxLength={2000}
            className="mt-2 w-full resize-y border border-dashed border-ink-line bg-ink/50 px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:border-gold focus:outline-none"
            placeholder="Staff-only notes. Never shown to guests."
          />
          <button
            type="button"
            disabled={busy}
            onClick={saveInternalNotes}
            className="mt-4 inline-flex items-center justify-center border border-cream/30 px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase text-cream hover:border-gold hover:text-gold disabled:opacity-50"
          >
            Save internal notes
          </button>
          <p className="mt-3 text-xs leading-relaxed text-cream-muted">
            Cleared by saving an empty field. Not included in public booking APIs
            or guest emails.
          </p>
        </Section>

        <Section title="Booking timeline">
          {timeline.length === 0 ? (
            <p className="mt-4 text-sm text-cream-muted">No timeline events.</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {timeline.map((event) => (
                <li
                  key={`${event.label}-${event.at}`}
                  className="border-l border-gold/40 pl-4"
                >
                  <div className="text-[10px] tracking-[0.2em] uppercase text-cream-muted">
                    {formatDateTime(event.at)}
                  </div>
                  <div className="mt-1 text-sm text-cream">{event.label}</div>
                  {event.detail && (
                    <div className="mt-1 text-xs text-cream-dim">
                      {event.detail}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
          <dl className="mt-4">
            <Row label="Created" value={formatDateTime(booking.created_at)} />
            <Row label="Updated" value={formatDateTime(booking.updated_at)} />
            <Row
              label="Confirmed"
              value={formatDateTime(booking.confirmed_at)}
            />
            <Row
              label="Cancelled"
              value={formatDateTime(booking.cancelled_at)}
            />
          </dl>
        </Section>
      </div>

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={
          pendingAction?.value === "cancelled"
            ? "Cancel booking"
            : pendingAction?.label || "Update status"
        }
        message={
          pendingAction?.value === "cancelled"
            ? `Cancel reservation ${booking.booking_number}? This releases inventory for the stay nights and cannot be undone from this screen.`
            : pendingAction
              ? `Change this booking to “${pendingAction.value.replace(/_/g, " ")}”? Invalid transitions are blocked by the API.`
              : ""
        }
        confirmLabel={
          pendingAction?.value === "cancelled"
            ? "Confirm cancellation"
            : pendingAction?.label || "Confirm"
        }
        busy={busy}
        onCancel={() => {
          if (!busy) {
            setPendingAction(null);
            setCancelReason("");
          }
        }}
        onConfirm={confirmPendingAction}
      >
        {pendingAction?.value === "cancelled" && (
          <div className="mt-4">
            <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
              Cancellation reason{" "}
              <span className="normal-case tracking-normal text-cream-dim">
                (optional)
              </span>
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={2000}
              className="mt-2 w-full resize-y bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
              placeholder="Optional note for the guest cancellation email / records."
            />
            <p className="mt-2 text-xs text-cream-muted">
              Stored as cancellation_reason. May appear in guest cancellation
              emails — not the same as private internal notes.
            </p>
          </div>
        )}
        {pendingAction?.value === "no_show" && (
          <div className="mt-4">
            <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
              No-show reason <span className="text-gold">*</span>
            </label>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={2000}
              className="mt-2 w-full resize-y bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
              placeholder="Why is this booking being marked no-show?"
            />
            <p className="mt-2 text-xs text-cream-muted">
              Stored as cancellation_reason.
            </p>
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmStaySave}
        title="Confirm stay modification"
        message={`Update stay for ${booking.booking_number}? Inventory is re-checked for the full revised stay (this booking’s current hold is excluded). Pricing will be recalculated from the room type base price unless amounts were sent explicitly via API.`}
        confirmLabel="Save stay changes"
        busy={busy}
        onCancel={() => {
          if (!busy) setConfirmStaySave(false);
        }}
        onConfirm={confirmStaySaveAction}
      >
        <dl className="mt-4 space-y-2 text-sm text-cream">
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-cream-muted">
              Dates{" "}
            </span>
            {stayForm.check_in_date} → {stayForm.check_out_date} ({stayNights}{" "}
            night{stayNights === 1 ? "" : "s"})
          </div>
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-cream-muted">
              Room type{" "}
            </span>
            {selectedStayRoomType?.name || stayForm.room_type_id}
            {` · ${stayForm.number_of_rooms} room(s)`}
          </div>
          <div>
            <span className="text-[10px] tracking-[0.2em] uppercase text-cream-muted">
              Indicative total{" "}
            </span>
            {proposedPricing.onRequest
              ? "On request"
              : formatPrice(proposedPricing.total, currency)}
          </div>
          {stayAvailability?.ok && (
            <div className="text-xs text-cream-muted">
              Last availability check: {stayAvailability.message}
            </div>
          )}
        </dl>
      </ConfirmDialog>
    </div>
  );
}

function resultRooms(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}
