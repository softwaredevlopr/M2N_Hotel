"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { createBooking } from "@/lib/api";
import {
  MAX_ADULTS,
  MAX_CHILDREN,
  MAX_ROOMS,
  MAX_STAY_NIGHTS,
  addDays,
  countSellableRooms,
  nightsBetween,
  todayIso,
} from "@/lib/bookingPricing";
import { rememberBookingContact } from "@/lib/bookingSession";
import BookingHotelStep from "./BookingHotelStep";
import BookingStayStep from "./BookingStayStep";
import BookingGuestStep from "./BookingGuestStep";
import BookingPriceSummary from "./BookingPriceSummary";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./formStyles";

const STEPS = [
  { id: 1, label: "Select Hotel" },
  { id: 2, label: "Room & Dates" },
  { id: 3, label: "Guest Details" },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d][\d\s()-]{6,}$/;

function initialState(initialHotelSlug, initialRoomTypeSlug) {
  return {
    hotelSlug: initialHotelSlug || "",
    roomTypeSlug: initialRoomTypeSlug || "",
    checkIn: "",
    checkOut: "",
    adults: 2,
    children: 0,
    rooms: 1,
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    specialRequests: "",
  };
}

function validateCount(rawValue, { min, max, required, whole, tooMany }) {
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < min) return required;
  if (!Number.isInteger(value)) return whole;
  if (value > max) return tooMany;
  return null;
}

/**
 * Occupancy is advisory rather than a hard limit — the property can add extra
 * bedding — so it surfaces as a notice instead of blocking the booking.
 */
function occupancyNotice(values, roomTypes) {
  const roomType = roomTypes.find((item) => item.slug === values.roomTypeSlug);
  const perRoom = Number(roomType?.max_occupancy);
  const roomCount = Number(values.rooms) || 1;
  const guests = Number(values.adults) + Math.max(Number(values.children), 0);

  if (!Number.isFinite(perRoom) || perRoom <= 0) return null;
  if (!Number.isFinite(guests) || guests <= perRoom * roomCount) return null;

  return `${roomType.name} sleeps up to ${perRoom} guests per room. We will arrange extra bedding where possible — additional charges may apply.`;
}

function validateStay(values, roomTypes, rooms) {
  const errors = {};
  const today = todayIso();

  if (!values.roomTypeSlug) {
    errors.roomTypeSlug = "Please select a room.";
  }

  if (!values.checkIn) {
    errors.checkIn = "Please select a check-in date.";
  } else if (values.checkIn < today) {
    errors.checkIn = "Check-in date cannot be in the past.";
  }

  if (!values.checkOut) {
    errors.checkOut = "Please select a check-out date.";
  } else if (values.checkIn && values.checkOut <= values.checkIn) {
    errors.checkOut = "Check-out must be after check-in.";
  } else if (nightsBetween(values.checkIn, values.checkOut) > MAX_STAY_NIGHTS) {
    errors.checkOut = `A stay cannot exceed ${MAX_STAY_NIGHTS} nights.`;
  }

  const adultsError = validateCount(values.adults, {
    min: 1,
    max: MAX_ADULTS,
    required: "At least one adult is required.",
    whole: "Enter a whole number of adults.",
    tooMany: `Up to ${MAX_ADULTS} adults can be booked online.`,
  });
  if (adultsError) errors.adults = adultsError;

  const childrenError = validateCount(values.children, {
    min: 0,
    max: MAX_CHILDREN,
    required: "Children cannot be negative.",
    whole: "Enter a whole number of children.",
    tooMany: `Up to ${MAX_CHILDREN} children can be booked online.`,
  });
  if (childrenError) errors.children = childrenError;

  const roomsError = validateCount(values.rooms, {
    min: 1,
    max: MAX_ROOMS,
    required: "At least one room is required.",
    whole: "Enter a whole number of rooms.",
    tooMany: `Up to ${MAX_ROOMS} rooms can be booked online.`,
  });
  const inventory = countSellableRooms(rooms, values.roomTypeSlug);
  if (roomsError) {
    errors.rooms = roomsError;
  } else if (values.roomTypeSlug && Number(values.rooms) > inventory) {
    errors.rooms =
      inventory === 0
        ? "This room is not available at the moment."
        : `Only ${inventory} room${inventory === 1 ? "" : "s"} of this type exist at this property.`;
  }

  const notice = occupancyNotice(values, roomTypes);
  if (notice) errors.occupancyNotice = notice;

  return errors;
}

function validateGuest(values) {
  const errors = {};

  if (values.guestName.trim().length < 2) {
    errors.guestName = "Please enter your full name.";
  }

  const phone = values.guestPhone.trim();
  if (!phone) {
    errors.guestPhone = "Please enter your mobile number.";
  } else if (!PHONE_REGEX.test(phone)) {
    errors.guestPhone = "Please enter a valid mobile number.";
  }

  const email = values.guestEmail.trim();
  if (!email) {
    errors.guestEmail = "Please enter your email address.";
  } else if (!EMAIL_REGEX.test(email)) {
    errors.guestEmail = "Please enter a valid email address.";
  }

  if (values.specialRequests.length > 2000) {
    errors.specialRequests = "Special requests must be under 2000 characters.";
  }

  return errors;
}

/** Errors that block progress; the occupancy notice is informational only. */
function hasBlockingErrors(errors) {
  return Object.keys(errors).some((key) => key !== "occupancyNotice");
}

export default function BookingFlow({
  hotels,
  roomTypesByHotel,
  roomsByHotel,
  tariffsByHotel = {},
  hotelImages = {},
  roomImagesByHotel = {},
  initialHotelSlug = "",
  initialRoomTypeSlug = "",
}) {
  const router = useRouter();
  const topRef = useRef(null);

  const [step, setStep] = useState(initialHotelSlug ? 2 : 1);
  const [values, setValues] = useState(() =>
    initialState(initialHotelSlug, initialRoomTypeSlug)
  );
  const [errors, setErrors] = useState({});
  const [submitState, setSubmitState] = useState("idle"); // idle | loading | error
  const [formError, setFormError] = useState(null);

  const hotel = useMemo(
    () => hotels.find((item) => item.slug === values.hotelSlug) || null,
    [hotels, values.hotelSlug]
  );
  const roomTypes = roomTypesByHotel[values.hotelSlug] || [];
  const rooms = roomsByHotel[values.hotelSlug] || [];
  const roomType =
    roomTypes.find((item) => item.slug === values.roomTypeSlug) || null;

  // Shown while the guest edits rather than only after they press Continue.
  const liveOccupancyNotice = useMemo(
    () => occupancyNotice(values, roomTypes),
    [values, roomTypes]
  );

  function scrollToTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateValue(field, value) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };

      // Keep the stay window coherent as the guest edits it.
      if (field === "checkIn") {
        if (!prev.checkOut || prev.checkOut <= value) {
          next.checkOut = value ? addDays(value, 1) : "";
        }
      }

      return next;
    });

    setErrors((prev) => {
      if (!prev[field] && !prev.availability) return prev;
      const next = { ...prev };
      delete next[field];
      delete next.availability;
      return next;
    });
    setFormError(null);
  }

  function selectHotel(slug) {
    setValues((prev) => ({
      ...prev,
      hotelSlug: slug,
      // Room types are property-specific; never carry a selection across hotels.
      roomTypeSlug: prev.hotelSlug === slug ? prev.roomTypeSlug : "",
    }));
    setErrors({});
    setFormError(null);
  }

  function goToStep(target, { preserveError = false } = {}) {
    setStep(target);
    if (!preserveError) setFormError(null);
    scrollToTop();
  }

  function handleContinue() {
    if (step === 1) {
      if (!values.hotelSlug) {
        setFormError("Please select a hotel to continue.");
        return;
      }
      goToStep(2);
      return;
    }

    if (step === 2) {
      const stayErrors = validateStay(values, roomTypes, rooms);
      setErrors(stayErrors);
      if (hasBlockingErrors(stayErrors)) {
        setFormError("Please review the highlighted fields and try again.");
        return;
      }
      goToStep(3);
    }
  }

  function buildPayload() {
    const payload = {
      hotel_id: hotel.id,
      room_type_id: roomType.id,
      guest_name: values.guestName.trim(),
      guest_email: values.guestEmail.trim(),
      guest_phone: values.guestPhone.trim(),
      check_in_date: values.checkIn,
      check_out_date: values.checkOut,
      adults: Number(values.adults),
      children: Number(values.children),
      number_of_rooms: Number(values.rooms),
    };

    const requests = values.specialRequests.trim();
    if (requests) payload.special_requests = requests;

    return payload;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitState === "loading") return;

    const stayErrors = validateStay(values, roomTypes, rooms);
    if (hasBlockingErrors(stayErrors)) {
      setErrors(stayErrors);
      setFormError({
        message: "Your stay details need attention before we can continue.",
      });
      goToStep(2, { preserveError: true });
      return;
    }

    const guestErrors = validateGuest(values);
    setErrors({ ...stayErrors, ...guestErrors });
    if (hasBlockingErrors(guestErrors)) {
      setFormError("Please review the highlighted fields and try again.");
      return;
    }

    setSubmitState("loading");
    setFormError(null);

    const result = await createBooking(buildPayload());

    if (result.networkError) {
      setSubmitState("error");
      setFormError({
        message:
          "Unable to reach the server. Please check your connection and try again.",
      });
      return;
    }

    if (!result.ok) {
      const apiMessage = result.data?.message;
      const apiErrors = Array.isArray(result.data?.errors)
        ? result.data.errors
        : [];

      // 409 means the property ran out of inventory for this window while the
      // guest was filling the form — send them back to adjust dates or rooms.
      if (result.status === 409) {
        setSubmitState("error");
        setErrors((prev) => ({
          ...prev,
          availability:
            apiMessage || "Those dates are no longer available for this room.",
        }));
        setFormError({
          message:
            apiMessage ||
            "Those dates are no longer available for this room. Please adjust your stay and try again.",
        });
        goToStep(2, { preserveError: true });
        return;
      }

      setSubmitState("error");
      setFormError({
        message:
          result.status === 429
            ? "Too many booking attempts. Please wait a moment and try again."
            : apiMessage ||
              "We could not complete your booking. Please try again or contact us directly.",
        errors: apiErrors,
      });
      return;
    }

    const bookingNumber = result.data?.data?.booking_number;
    if (!bookingNumber) {
      setSubmitState("error");
      setFormError({
        message:
          "Your booking was received but the reference could not be read. Please contact us to confirm.",
      });
      return;
    }

    rememberBookingContact(bookingNumber, {
      email: values.guestEmail.trim(),
      phone: values.guestPhone.trim(),
    });

    router.push(`/booking/${encodeURIComponent(bookingNumber)}`);
  }

  const isSubmitting = submitState === "loading";
  const showSummary = step >= 2;

  return (
    <div ref={topRef} className="scroll-mt-28">
      <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-line pb-6 text-[11px] tracking-[0.2em] uppercase">
        {STEPS.map((item, index) => (
          <li key={item.id} className="flex items-center gap-3">
            {index > 0 && (
              <span aria-hidden className="text-gold/40">
                ·
              </span>
            )}
            <span
              aria-current={step === item.id ? "step" : undefined}
              className={
                step === item.id
                  ? "text-gold"
                  : step > item.id
                  ? "text-cream-dim"
                  : "text-cream-muted"
              }
            >
              {item.id}. {item.label}
            </span>
          </li>
        ))}
      </ol>

      <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        {formError && (
          <div
            role="alert"
            aria-live="assertive"
            className="mt-8 flex gap-3 border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
          >
            <AlertCircle
              className="h-5 w-5 flex-shrink-0 text-gold"
              strokeWidth={1.5}
            />
            <div>
              <p>{typeof formError === "string" ? formError : formError.message}</p>
              {formError?.errors?.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {formError.errors.map((message, index) => (
                    <li key={`${message}-${index}`}>{message}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="lg:col-start-1 lg:row-start-1">
            {step === 1 && (
              <BookingHotelStep
                hotels={hotels}
                roomTypesByHotel={roomTypesByHotel}
                hotelImages={hotelImages}
                selectedSlug={values.hotelSlug}
                onSelect={selectHotel}
              />
            )}

            {step === 2 && (
              <BookingStayStep
                hotel={hotel}
                roomTypes={roomTypes}
                rooms={rooms}
                roomImages={roomImagesByHotel[values.hotelSlug] || {}}
                values={values}
                errors={{ ...errors, occupancyNotice: liveOccupancyNotice }}
                onChange={updateValue}
              />
            )}

            {step === 3 && (
              <BookingGuestStep
                values={values}
                errors={errors}
                onChange={updateValue}
              />
            )}
          </div>

          {showSummary && (
            <div className="lg:col-start-2 lg:row-start-1">
              <BookingPriceSummary
                hotel={hotel}
                roomType={roomType}
                tariff={tariffsByHotel[values.hotelSlug] || null}
                checkIn={values.checkIn}
                checkOut={values.checkOut}
                adults={values.adults}
                children={values.children}
                rooms={values.rooms}
                className="lg:sticky lg:top-28"
              />
            </div>
          )}
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-ink-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => goToStep(Math.max(1, step - 1))}
            disabled={step === 1 || isSubmitting}
            className={`${SECONDARY_BUTTON_CLASS} w-full sm:w-auto ${
              step === 1 ? "invisible hidden sm:inline-flex" : ""
            }`}
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleContinue}
              className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
            >
              Continue
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              )}
              {isSubmitting ? "Confirming..." : "Confirm Booking"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
