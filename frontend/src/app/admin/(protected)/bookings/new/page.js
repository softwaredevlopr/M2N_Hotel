"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import BookingCreateForm from "@/components/admin/BookingCreateForm";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/Toast";
import { clearAdminSession } from "@/lib/adminAuth";
import {
  createAdminBooking,
  emptyAdminBookingForm,
  formToAdminBookingPayload,
  formatApiError,
  validateAdminBookingForm,
} from "@/lib/adminBookings";
import { listAdminHotels } from "@/lib/adminHotels";
import { listAdminRoomTypes } from "@/lib/adminRoomTypes";
import { getBookingAvailability } from "@/lib/api";
import {
  calculateStayTotals,
  formatStayDate,
  nightsBetween,
  todayIso,
  addDays,
} from "@/lib/bookingPricing";
import { formatPrice } from "@/lib/format";

export default function NewAdminBookingPage() {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState(() => {
    const today = todayIso();
    return {
      ...emptyAdminBookingForm(),
      check_in_date: today,
      check_out_date: addDays(today, 1),
    };
  });
  const [hotels, setHotels] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loadingHotels, setLoadingHotels] = useState(true);
  const [loadingRoomTypes, setLoadingRoomTypes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [created, setCreated] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function loadHotels() {
      setLoadingHotels(true);
      const result = await listAdminHotels();
      if (cancelled) return;
      if (result.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (!result.ok) {
        toast.error(formatApiError(result, "Unable to load hotels."));
        setHotels([]);
      } else {
        setHotels(result.data?.data || []);
      }
      setLoadingHotels(false);
    }
    loadHotels();
    return () => {
      cancelled = true;
    };
  }, [router, toast]);

  useEffect(() => {
    let cancelled = false;
    async function loadRoomTypes() {
      if (!form.hotel_id) {
        setRoomTypes([]);
        return;
      }
      setLoadingRoomTypes(true);
      const result = await listAdminRoomTypes({ hotel_id: form.hotel_id });
      if (cancelled) return;
      if (result.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (!result.ok) {
        toast.error(formatApiError(result, "Unable to load room types."));
        setRoomTypes([]);
      } else {
        const list = (result.data?.data || []).filter(
          (rt) => rt.status !== "archived"
        );
        setRoomTypes(list);
      }
      setLoadingRoomTypes(false);
    }
    loadRoomTypes();
    return () => {
      cancelled = true;
    };
  }, [form.hotel_id, router, toast]);

  // Clear stale availability when stay inputs change.
  useEffect(() => {
    setAvailability(null);
  }, [
    form.hotel_id,
    form.room_type_id,
    form.check_in_date,
    form.check_out_date,
    form.number_of_rooms,
  ]);

  const selectedHotel = useMemo(
    () => hotels.find((h) => h.id === form.hotel_id) || null,
    [hotels, form.hotel_id]
  );
  const selectedRoomType = useMemo(
    () => roomTypes.find((rt) => rt.id === form.room_type_id) || null,
    [roomTypes, form.room_type_id]
  );

  const nights = nightsBetween(form.check_in_date, form.check_out_date);
  const rooms = Number(form.number_of_rooms) || 0;
  const currency = selectedHotel?.currency_code || "INR";

  const priceSummary = useMemo(() => {
    const totals = calculateStayTotals({
      basePrice: selectedRoomType?.base_price,
      nights,
      rooms,
    });
    return { ...totals, currency };
  }, [selectedRoomType, nights, rooms, currency]);

  const runAvailabilityCheck = useCallback(async () => {
    const validation = validateAdminBookingForm(form);
    const stayErrors = {};
    if (validation.fieldErrors.hotel_id) {
      stayErrors.hotel_id = validation.fieldErrors.hotel_id;
    }
    if (validation.fieldErrors.room_type_id) {
      stayErrors.room_type_id = validation.fieldErrors.room_type_id;
    }
    if (validation.fieldErrors.check_in_date) {
      stayErrors.check_in_date = validation.fieldErrors.check_in_date;
    }
    if (validation.fieldErrors.check_out_date) {
      stayErrors.check_out_date = validation.fieldErrors.check_out_date;
    }
    if (validation.fieldErrors.number_of_rooms) {
      stayErrors.number_of_rooms = validation.fieldErrors.number_of_rooms;
    }
    if (Object.keys(stayErrors).length > 0) {
      setFieldErrors((prev) => ({ ...prev, ...stayErrors }));
      setAvailability({
        ok: false,
        available: false,
        message: "Fix stay fields before checking availability.",
      });
      return null;
    }

    setAvailabilityLoading(true);
    setAvailability(null);

    const result = await getBookingAvailability({
      hotelId: form.hotel_id,
      roomTypeId: form.room_type_id,
      checkInDate: form.check_in_date,
      checkOutDate: form.check_out_date,
      numberOfRooms: Number(form.number_of_rooms) || 1,
    });

    setAvailabilityLoading(false);

    if (!result.ok) {
      const message =
        result.status === 409
          ? formatApiError(result, "Property is not open for online availability checks.")
          : formatApiError(
              result,
              "Unable to check availability. The create API will still re-validate inventory."
            );
      setAvailability({ ok: false, available: false, message });
      return { ok: false, available: false, result };
    }

    const roomTypesAvail = result.data?.data?.room_types || [];
    const match =
      roomTypesAvail.find((rt) => rt.room_type_id === form.room_type_id) ||
      roomTypesAvail[0];

    if (!match) {
      const message =
        "No availability data for this room type (it may be inactive on the public inventory probe). Create will still enforce inventory.";
      setAvailability({ ok: true, available: false, message, match: null });
      return { ok: true, available: false, match: null, result };
    }

    const available = Boolean(match.is_available);
    const left = Number(match.available_rooms);
    const message = available
      ? `Available — ${left} room(s) free for these dates.`
      : `Not available — only ${Number.isFinite(left) ? left : 0} room(s) free (need ${form.number_of_rooms}).`;

    setAvailability({ ok: true, available, message, match });
    return { ok: true, available, match, result };
  }, [form]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;

    const validation = validateAdminBookingForm(form);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setError("Please fix the highlighted fields.");
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setFieldErrors({});
    setError("");

    const avail = await runAvailabilityCheck();
    if (avail && avail.ok && avail.available === false && avail.match) {
      setError(
        "Selected dates are not available for this room type. Adjust dates or rooms and check again."
      );
      toast.error("Selected stay is not available.");
      return;
    }

    setSubmitting(true);

    const payload = formToAdminBookingPayload(form, {
      subtotal: priceSummary.subtotal,
      taxAmount: 0,
      totalAmount: priceSummary.total,
      currency,
    });

    const result = await createAdminBooking(payload);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      const message = formatApiError(result, "Unable to create booking.");
      setError(message);
      toast.error(message);
      setSubmitting(false);
      return;
    }

    const booking = result.data?.data || null;
    setCreated(booking);
    setSubmitting(false);
    toast.success(
      booking?.booking_number
        ? `Booking ${booking.booking_number} created.`
        : "Booking created."
    );
  }

  if (created) {
    return (
      <div>
        <Link
          href="/admin/bookings"
          className="text-[11px] tracking-[0.22em] uppercase text-cream-muted transition-colors hover:text-gold"
        >
          ← Bookings
        </Link>

        <div className="mt-8 border border-ink-line bg-ink-soft p-6 sm:p-10">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-emerald-400" strokeWidth={1.5} />
            <div>
              <span className="text-xs tracking-[0.45em] uppercase text-gold">
                Confirmed
              </span>
              <h1 className="mt-3 font-display text-3xl text-cream sm:text-4xl">
                Booking created
              </h1>
              <p className="mt-2 text-sm text-cream-dim">
                Reservation{" "}
                <span className="text-cream">{created.booking_number}</span> is
                saved. A guest confirmation email is queued when email delivery is
                enabled.
              </p>
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-1 gap-4 border-t border-ink-line pt-8 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[11px] tracking-[0.22em] uppercase text-cream-muted">
                Guest
              </dt>
              <dd className="mt-1 text-cream">{created.guest_name}</dd>
              <dd className="text-cream-dim">{created.guest_email}</dd>
              <dd className="text-cream-dim">{created.guest_phone}</dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-[0.22em] uppercase text-cream-muted">
                Property
              </dt>
              <dd className="mt-1 text-cream">{created.hotel_name}</dd>
              <dd className="text-cream-dim">{created.room_type_name}</dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-[0.22em] uppercase text-cream-muted">
                Stay
              </dt>
              <dd className="mt-1 text-cream">
                {formatStayDate(created.check_in_date)} →{" "}
                {formatStayDate(created.check_out_date)}
              </dd>
              <dd className="text-cream-dim">
                {created.adults} adult(s)
                {Number(created.children) > 0
                  ? `, ${created.children} child(ren)`
                  : ""}
                · {created.number_of_rooms} room(s)
              </dd>
            </div>
            <div>
              <dt className="text-[11px] tracking-[0.22em] uppercase text-cream-muted">
                Status / total
              </dt>
              <dd className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={created.booking_status} />
                <StatusBadge status={created.payment_status} />
              </dd>
              <dd className="mt-2 font-display text-xl text-cream">
                {Number(created.total_amount) > 0
                  ? formatPrice(created.total_amount, created.currency || currency)
                  : "Price on request"}
              </dd>
            </div>
            {created.special_requests ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] tracking-[0.22em] uppercase text-cream-muted">
                  Guest special requests
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-cream-dim">
                  {created.special_requests}
                </dd>
              </div>
            ) : null}
            {created.admin_notes ? (
              <div className="sm:col-span-2">
                <dt className="text-[11px] tracking-[0.22em] uppercase text-cream-muted">
                  Internal notes (staff only)
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-cream-dim">
                  {created.admin_notes}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href={`/admin/bookings/${created.id}`}
              className="inline-flex items-center justify-center bg-gold px-8 py-3.5 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:bg-gold-soft"
            >
              View booking
            </Link>
            <button
              type="button"
              onClick={() => {
                const today = todayIso();
                setCreated(null);
                setForm({
                  ...emptyAdminBookingForm(),
                  check_in_date: today,
                  check_out_date: addDays(today, 1),
                });
                setAvailability(null);
                setError("");
                setFieldErrors({});
              }}
              className="inline-flex items-center justify-center border border-ink-line px-8 py-3.5 text-[11px] tracking-[0.22em] uppercase text-cream-muted transition-colors hover:border-gold hover:text-gold"
            >
              Create another
            </button>
            <Link
              href="/admin/bookings"
              className="inline-flex items-center justify-center border border-ink-line px-8 py-3.5 text-[11px] tracking-[0.22em] uppercase text-cream-muted transition-colors hover:border-gold hover:text-gold"
            >
              Back to list
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/bookings"
        className="text-[11px] tracking-[0.22em] uppercase text-cream-muted transition-colors hover:text-gold"
      >
        ← Bookings
      </Link>

      <div className="mt-8">
        <span className="text-xs tracking-[0.45em] uppercase text-gold">
          New booking
        </span>
        <div className="gold-divider mt-5" />
        <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
          Create booking
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-cream-dim">
          Record a phone, walk-in, or staff reservation. Availability is checked
          against live inventory before submit; notes use the existing special
          requests field.
        </p>
      </div>

      {(loadingHotels || loadingRoomTypes) && (
        <p className="mt-6 inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading…
        </p>
      )}

      <div className="mt-10">
        <BookingCreateForm
          form={form}
          hotels={hotels}
          roomTypes={roomTypes}
          priceSummary={priceSummary}
          availability={availability}
          availabilityLoading={availabilityLoading}
          onChange={setForm}
          onSubmit={handleSubmit}
          onCheckAvailability={runAvailabilityCheck}
          isLoading={submitting}
          errorMessage={error}
          fieldErrors={fieldErrors}
        />
      </div>
    </div>
  );
}
