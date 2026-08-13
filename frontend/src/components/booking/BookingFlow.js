"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { createBooking, getBookingAvailability } from "@/lib/api";
import {
  MAX_ADULTS,
  MAX_CHILDREN,
  MAX_ROOMS,
  MAX_STAY_NIGHTS,
  addDays,
  getTariffSettings,
  nightsBetween,
  todayIso,
} from "@/lib/bookingPricing";
import { rememberBookingContact } from "@/lib/bookingSession";
import BookingStepper from "./BookingStepper";
import StayDetailsStep from "./StayDetailsStep";
import AvailableRoomsStep from "./AvailableRoomsStep";
import GuestDetailsStep from "./GuestDetailsStep";
import BookingReviewStep from "./BookingReviewStep";
import BookingConfirmation from "./BookingConfirmation";
import BookingSummary from "./BookingSummary";
import { PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from "./formStyles";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function initialState(initialHotelSlug, initialRoomTypeSlug) {
  return {
    hotelSlug: initialHotelSlug || "",
    roomTypeSlug: initialRoomTypeSlug || "",
    roomTypeId: "",
    checkIn: "",
    checkOut: "",
    adults: 2,
    children: 0,
    rooms: 1,
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    specialRequests: "",
    emailUpdates: true,
    smsOptIn: false,
    whatsappOptIn: false,
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
 * Indian-mobile-friendly check without hardcoding a real number:
 * - 10 digits starting 6–9
 * - optional leading 0 / 91 / +91
 * - otherwise 7–15 digits (matches backend create validator)
 */
function isValidGuestPhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return /^[6-9]\d{9}$/.test(digits);
  if (digits.length === 11 && digits.startsWith("0")) {
    return /^0[6-9]\d{9}$/.test(digits);
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return /^91[6-9]\d{9}$/.test(digits);
  }
  return digits.length >= 7 && digits.length <= 15;
}

function validateStayDetails(values) {
  const errors = {};
  const today = todayIso();

  if (!values.hotelSlug) {
    errors.hotelSlug = "Please select a hotel.";
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
  if (roomsError) errors.rooms = roomsError;

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
  } else if (!isValidGuestPhone(phone)) {
    errors.guestPhone =
      "Enter a valid Indian mobile number (10 digits starting 6–9) or include country code.";
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

export default function BookingFlow({
  hotels,
  roomTypesByHotel,
  tariffsByHotel = {},
  hotelImages = {},
  roomImagesByHotel = {},
  initialHotelSlug = "",
  initialRoomTypeSlug = "",
}) {
  const topRef = useRef(null);
  const [step, setStep] = useState(1);
  const [values, setValues] = useState(() =>
    initialState(initialHotelSlug, initialRoomTypeSlug)
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitState, setSubmitState] = useState("idle");
  const [availabilityState, setAvailabilityState] = useState("idle");
  const [availabilityError, setAvailabilityError] = useState(null);
  const [availabilityOptions, setAvailabilityOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  const hotel = useMemo(
    () => hotels.find((item) => item.slug === values.hotelSlug) || null,
    [hotels, values.hotelSlug]
  );
  const roomTypes = roomTypesByHotel[values.hotelSlug] || [];
  const roomType =
    roomTypes.find((item) => item.id === values.roomTypeId) ||
    roomTypes.find((item) => item.slug === values.roomTypeSlug) ||
    null;

  const loadAvailability = useCallback(async () => {
    if (!hotel?.id || !values.checkIn || !values.checkOut) return;

    setAvailabilityState("loading");
    setAvailabilityError(null);

    const result = await getBookingAvailability({
      hotelId: hotel.id,
      checkInDate: values.checkIn,
      checkOutDate: values.checkOut,
      numberOfRooms: Number(values.rooms) || 1,
    });

    if (result.networkError) {
      setAvailabilityState("error");
      setAvailabilityOptions([]);
      setAvailabilityError(
        "Unable to reach the server. Please check your connection and try again."
      );
      return;
    }

    if (!result.ok) {
      const apiErrors = Array.isArray(result.data?.errors)
        ? result.data.errors.join(" ")
        : null;
      setAvailabilityState("error");
      setAvailabilityOptions([]);
      setAvailabilityError(
        apiErrors ||
          result.data?.message ||
          "We could not load availability for these dates."
      );
      return;
    }

    const options = result.data?.data?.room_types || [];
    setAvailabilityOptions(options);
    setAvailabilityState("ready");

    setSelectedOption((prev) => {
      if (prev) {
        const still = options.find(
          (item) => item.room_type_id === prev.room_type_id && item.is_available
        );
        if (still) return still;
      }

      if (values.roomTypeSlug) {
        const preferred = options.find(
          (item) => item.slug === values.roomTypeSlug && item.is_available
        );
        if (preferred) return preferred;
      }

      return null;
    });
  }, [
    hotel?.id,
    values.checkIn,
    values.checkOut,
    values.rooms,
    values.roomTypeSlug,
  ]);

  useEffect(() => {
    if (step === 2) {
      loadAvailability();
    }
  }, [step, loadAvailability]);

  function scrollToTop() {
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateValue(field, value) {
    setValues((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "checkIn") {
        if (!prev.checkOut || prev.checkOut <= value) {
          next.checkOut = value ? addDays(value, 1) : "";
        }
      }
      return next;
    });

    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormError(null);
    setSelectedOption(null);
  }

  function selectHotel(slug) {
    setValues((prev) => ({
      ...prev,
      hotelSlug: slug,
      roomTypeSlug: prev.hotelSlug === slug ? prev.roomTypeSlug : "",
      roomTypeId: prev.hotelSlug === slug ? prev.roomTypeId : "",
    }));
    setSelectedOption(null);
    setAvailabilityOptions([]);
    setErrors({});
    setFormError(null);
  }

  function selectRoomOption(option) {
    setSelectedOption(option);
    setValues((prev) => ({
      ...prev,
      roomTypeId: option.room_type_id,
      roomTypeSlug: option.slug,
    }));
    setFormError(null);
  }

  function goToStep(target, { preserveError = false } = {}) {
    setStep(target);
    if (!preserveError) setFormError(null);
    scrollToTop();
  }

  function handleContinue() {
    if (step === 1) {
      const stayErrors = validateStayDetails(values);
      setErrors(stayErrors);
      if (Object.keys(stayErrors).length > 0) {
        setFormError("Please review the highlighted fields and try again.");
        return;
      }
      goToStep(2);
      return;
    }

    if (step === 2) {
      if (!selectedOption?.room_type_id || !selectedOption.is_available) {
        setFormError("Please select an available room to continue.");
        return;
      }
      goToStep(3);
      return;
    }

    if (step === 3) {
      const guestErrors = validateGuest(values);
      setErrors(guestErrors);
      if (Object.keys(guestErrors).length > 0) {
        setFormError("Please review the highlighted fields and try again.");
        return;
      }
      goToStep(4);
    }
  }

  function buildPayload() {
    const payload = {
      hotel_id: hotel.id,
      room_type_id: selectedOption.room_type_id,
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

    payload.notification_preferences = {
      email_updates: Boolean(values.emailUpdates),
      sms_opt_in: Boolean(values.smsOptIn),
      whatsapp_opt_in: Boolean(values.whatsappOptIn),
    };

    return payload;
  }

  async function handleConfirmBooking() {
    if (submitState === "loading" || step !== 4) return;

    const stayErrors = validateStayDetails(values);
    const guestErrors = validateGuest(values);
    if (Object.keys(stayErrors).length > 0) {
      setErrors(stayErrors);
      setFormError("Your stay details need attention before we can continue.");
      goToStep(1, { preserveError: true });
      return;
    }
    if (!selectedOption?.room_type_id) {
      setFormError("Please select an available room to continue.");
      goToStep(2, { preserveError: true });
      return;
    }
    if (Object.keys(guestErrors).length > 0) {
      setErrors(guestErrors);
      setFormError("Please review the highlighted fields and try again.");
      goToStep(3, { preserveError: true });
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

      if (result.status === 409) {
        setSubmitState("error");
        setFormError({
          message:
            apiMessage ||
            "Those dates are no longer available for this room. Please choose another option.",
        });
        goToStep(2, { preserveError: true });
        loadAvailability();
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

    const booking = result.data?.data;
    if (!booking?.booking_number) {
      setSubmitState("error");
      setFormError({
        message:
          "Your booking was received but the reference could not be read. Please contact us to confirm.",
      });
      return;
    }

    rememberBookingContact(booking.booking_number, {
      email: values.guestEmail.trim(),
      phone: values.guestPhone.trim(),
    });

    setConfirmedBooking(booking);
    setSubmitState("idle");
    goToStep(5);
  }

  const isSubmitting = submitState === "loading";
  const showSummary = step >= 1 && step <= 4;
  const tariffSettings = getTariffSettings(hotel);

  return (
    <div ref={topRef} className="scroll-mt-28">
      <BookingStepper currentStep={step} />

      {step < 5 && (
        <div aria-busy={isSubmitting}>
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
                <p>
                  {typeof formError === "string"
                    ? formError
                    : formError.message}
                </p>
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
                <StayDetailsStep
                  hotels={hotels}
                  roomTypesByHotel={roomTypesByHotel}
                  hotelImages={hotelImages}
                  values={values}
                  errors={errors}
                  onChange={updateValue}
                  onSelectHotel={selectHotel}
                />
              )}

              {step === 2 && (
                <AvailableRoomsStep
                  hotel={hotel}
                  roomImages={roomImagesByHotel[values.hotelSlug] || {}}
                  preferredRoomTypeSlug={initialRoomTypeSlug || values.roomTypeSlug}
                  options={availabilityOptions}
                  selectedRoomTypeId={selectedOption?.room_type_id || ""}
                  loading={availabilityState === "loading"}
                  error={
                    availabilityState === "error" ? availabilityError : null
                  }
                  onSelect={selectRoomOption}
                  onRetry={loadAvailability}
                />
              )}

              {step === 3 && (
                <GuestDetailsStep
                  values={values}
                  errors={errors}
                  onChange={updateValue}
                />
              )}

              {step === 4 && (
                <BookingReviewStep
                  hotel={hotel}
                  values={values}
                  selectedOption={selectedOption}
                  tariffSettings={tariffSettings}
                />
              )}
            </div>

            {showSummary && (
              <div className="lg:col-start-2 lg:row-start-1">
                <BookingSummary
                  hotel={hotel}
                  roomType={roomType}
                  availabilityOption={selectedOption}
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

            {step < 4 ? (
              <button
                type="button"
                onClick={handleContinue}
                disabled={step === 2 && availabilityState === "loading"}
                className={`${PRIMARY_BUTTON_CLASS} w-full sm:w-auto`}
              >
                Continue
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleConfirmBooking}
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
        </div>
      )}

      {step === 5 && (
        <div className="mt-10">
          <BookingConfirmation
            booking={confirmedBooking}
            hotelSlug={hotel?.slug || confirmedBooking?.hotel_slug}
          />
        </div>
      )}
    </div>
  );
}
