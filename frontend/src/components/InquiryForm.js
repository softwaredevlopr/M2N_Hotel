"use client";

import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { createInquiry } from "@/lib/api";

const BASE_INPUT_CLASS =
  "w-full bg-ink border px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:outline-none transition-colors";
const LABEL_CLASS =
  "block text-[11px] tracking-[0.25em] uppercase text-cream-muted mb-2";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d][\d\s()-]{6,}$/;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(defaultRoomTypeSlug) {
  return {
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    check_in_date: "",
    check_out_date: "",
    adults_count: 1,
    children_count: 0,
    room_type_slug: defaultRoomTypeSlug || "",
    message: "",
  };
}

// Client-side validation mirrors the backend rules so guests get instant,
// friendly feedback before a network round-trip.
function validateForm(form) {
  const fieldErrors = {};
  const name = form.guest_name.trim();
  const email = form.guest_email.trim();
  const phone = form.guest_phone.trim();

  if (name.length < 2) {
    fieldErrors.guest_name = "Please enter your full name.";
  }

  // Mobile is required on the form (backend treats guest_phone as optional).
  if (!phone) {
    fieldErrors.guest_phone = "Please enter your mobile number.";
  } else if (!PHONE_REGEX.test(phone)) {
    fieldErrors.guest_phone = "Please enter a valid mobile number.";
  }

  // guest_email is required by the API contract — keep it required here.
  if (!email) {
    fieldErrors.guest_email = "Please enter your email address.";
  } else if (!EMAIL_REGEX.test(email)) {
    fieldErrors.guest_email = "Please enter a valid email address.";
  }

  if (!form.check_in_date) {
    fieldErrors.check_in_date = "Please select a check-in date.";
  } else if (form.check_in_date < todayISO()) {
    fieldErrors.check_in_date = "Check-in date cannot be in the past.";
  }

  if (!form.check_out_date) {
    fieldErrors.check_out_date = "Please select a check-out date.";
  } else if (
    form.check_in_date &&
    form.check_out_date <= form.check_in_date
  ) {
    fieldErrors.check_out_date = "Check-out must be after check-in.";
  }

  if (Number(form.adults_count) < 1) {
    fieldErrors.adults_count = "At least one adult is required.";
  }
  if (Number(form.children_count) < 0) {
    fieldErrors.children_count = "Children cannot be negative.";
  }

  return fieldErrors;
}

function inputClass(hasError) {
  return `${BASE_INPUT_CLASS} ${
    hasError
      ? "border-gold focus:border-gold"
      : "border-ink-line focus:border-gold"
  }`;
}

// Reusable booking inquiry form. Works on hotel pages and room pages — pass the
// hotel slug (required) and optionally the hotel's room types for the dropdown.
export default function InquiryForm({
  hotelSlug,
  hotelName,
  roomTypes = [],
  defaultRoomTypeSlug = "",
  className = "",
}) {
  const [form, setForm] = useState(() => emptyForm(defaultRoomTypeSlug));
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [errors, setErrors] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear a field's inline error as soon as the guest edits it.
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function buildPayload() {
    const payload = {
      hotel_slug: hotelSlug,
      guest_name: form.guest_name.trim(),
      guest_email: form.guest_email.trim(),
      guest_phone: form.guest_phone.trim(),
      check_in_date: form.check_in_date,
      check_out_date: form.check_out_date,
      adults_count: Number(form.adults_count) || 1,
      children_count: Number(form.children_count) || 0,
      source: "website",
    };
    if (form.room_type_slug) payload.room_type_slug = form.room_type_slug;
    if (form.message.trim()) payload.message = form.message.trim();
    return payload;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "loading") return;
    if (!hotelSlug) {
      setErrorMessage(
        "Hotel context is missing. Please open this form from a hotel page."
      );
      setStatus("error");
      return;
    }

    const validationErrors = validateForm(form);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setErrors([]);
      setErrorMessage("Please review the highlighted fields and try again.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrors([]);
    setErrorMessage("");
    setFieldErrors({});

    const result = await createInquiry(buildPayload());

    if (result.networkError) {
      setErrorMessage(
        "Unable to reach the server. Please check your connection and try again."
      );
      setStatus("error");
      return;
    }

    if (!result.ok) {
      const data = result.data;
      if (data && Array.isArray(data.errors) && data.errors.length > 0) {
        setErrors(data.errors);
      }
      setErrorMessage(
        (data && data.message) ||
          "Something went wrong. Please try again or contact us directly."
      );
      setStatus("error");
      return;
    }

    setStatus("success");
    setForm(emptyForm(defaultRoomTypeSlug));
  }

  if (status === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`border border-gold/40 bg-ink-soft p-8 text-center ${className}`}
      >
        <CheckCircle2
          className="mx-auto h-10 w-10 text-gold"
          strokeWidth={1.5}
        />
        <h3 className="mt-5 font-display text-2xl text-cream">
          Inquiry received
        </h3>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-cream-dim">
          Thank you for reaching out{hotelName ? ` to ${hotelName}` : ""}. Our
          team will be in touch shortly to confirm availability and your booking
          details.
        </p>
        <button
          type="button"
          onClick={() => setStatus("idle")}
          className="mt-6 inline-flex items-center justify-center border border-cream/30 px-7 py-3 text-xs tracking-[0.25em] uppercase text-cream hover:border-gold hover:text-gold transition-colors"
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  const isLoading = status === "loading";

  return (
    <form
      onSubmit={handleSubmit}
      className={`border border-ink-line bg-ink-soft p-6 sm:p-8 ${className}`}
      aria-busy={isLoading}
      noValidate
    >
      {status === "error" && (errorMessage || errors.length > 0) && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-6 flex gap-3 border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
        >
          <AlertCircle
            className="h-5 w-5 flex-shrink-0 text-gold"
            strokeWidth={1.5}
          />
          <div>
            {errorMessage && <p>{errorMessage}</p>}
            {errors.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errors.map((err, index) => (
                  <li key={`${err}-${index}`}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="sm:col-span-1">
          <label htmlFor="inq-name" className={LABEL_CLASS}>
            Full Name <span className="text-gold">*</span>
          </label>
          <input
            id="inq-name"
            type="text"
            required
            value={form.guest_name}
            onChange={(e) => updateField("guest_name", e.target.value)}
            className={inputClass(fieldErrors.guest_name)}
            placeholder="Your full name"
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.guest_name)}
            aria-describedby={fieldErrors.guest_name ? "inq-name-err" : undefined}
          />
          {fieldErrors.guest_name && (
            <p id="inq-name-err" className="mt-1.5 text-xs text-gold">
              {fieldErrors.guest_name}
            </p>
          )}
        </div>

        <div className="sm:col-span-1">
          <label htmlFor="inq-phone" className={LABEL_CLASS}>
            Mobile Number <span className="text-gold">*</span>
          </label>
          <input
            id="inq-phone"
            type="tel"
            required
            value={form.guest_phone}
            onChange={(e) => updateField("guest_phone", e.target.value)}
            className={inputClass(fieldErrors.guest_phone)}
            placeholder="e.g. +91 98765 43210"
            autoComplete="tel"
            aria-invalid={Boolean(fieldErrors.guest_phone)}
            aria-describedby={
              fieldErrors.guest_phone ? "inq-phone-err" : undefined
            }
          />
          {fieldErrors.guest_phone && (
            <p id="inq-phone-err" className="mt-1.5 text-xs text-gold">
              {fieldErrors.guest_phone}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="inq-email" className={LABEL_CLASS}>
            Email <span className="text-gold">*</span>
          </label>
          <input
            id="inq-email"
            type="email"
            required
            value={form.guest_email}
            onChange={(e) => updateField("guest_email", e.target.value)}
            className={inputClass(fieldErrors.guest_email)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.guest_email)}
            aria-describedby={
              fieldErrors.guest_email ? "inq-email-err" : undefined
            }
          />
          {fieldErrors.guest_email && (
            <p id="inq-email-err" className="mt-1.5 text-xs text-gold">
              {fieldErrors.guest_email}
            </p>
          )}
        </div>

        <div className="sm:col-span-1">
          <label htmlFor="inq-checkin" className={LABEL_CLASS}>
            Check-in Date <span className="text-gold">*</span>
          </label>
          <input
            id="inq-checkin"
            type="date"
            required
            min={todayISO()}
            value={form.check_in_date}
            onChange={(e) => updateField("check_in_date", e.target.value)}
            className={inputClass(fieldErrors.check_in_date)}
            aria-invalid={Boolean(fieldErrors.check_in_date)}
            aria-describedby={
              fieldErrors.check_in_date ? "inq-checkin-err" : undefined
            }
          />
          {fieldErrors.check_in_date && (
            <p id="inq-checkin-err" className="mt-1.5 text-xs text-gold">
              {fieldErrors.check_in_date}
            </p>
          )}
        </div>

        <div className="sm:col-span-1">
          <label htmlFor="inq-checkout" className={LABEL_CLASS}>
            Check-out Date <span className="text-gold">*</span>
          </label>
          <input
            id="inq-checkout"
            type="date"
            required
            min={form.check_in_date || todayISO()}
            value={form.check_out_date}
            onChange={(e) => updateField("check_out_date", e.target.value)}
            className={inputClass(fieldErrors.check_out_date)}
            aria-invalid={Boolean(fieldErrors.check_out_date)}
            aria-describedby={
              fieldErrors.check_out_date ? "inq-checkout-err" : undefined
            }
          />
          {fieldErrors.check_out_date && (
            <p id="inq-checkout-err" className="mt-1.5 text-xs text-gold">
              {fieldErrors.check_out_date}
            </p>
          )}
        </div>

        <div className="sm:col-span-1">
          <label htmlFor="inq-adults" className={LABEL_CLASS}>
            Adults <span className="text-gold">*</span>
          </label>
          <input
            id="inq-adults"
            type="number"
            min="1"
            required
            value={form.adults_count}
            onChange={(e) => updateField("adults_count", e.target.value)}
            className={inputClass(fieldErrors.adults_count)}
            aria-invalid={Boolean(fieldErrors.adults_count)}
            aria-describedby={
              fieldErrors.adults_count ? "inq-adults-err" : undefined
            }
          />
          {fieldErrors.adults_count && (
            <p id="inq-adults-err" className="mt-1.5 text-xs text-gold">
              {fieldErrors.adults_count}
            </p>
          )}
        </div>

        <div className="sm:col-span-1">
          <label htmlFor="inq-children" className={LABEL_CLASS}>
            Children
          </label>
          <input
            id="inq-children"
            type="number"
            min="0"
            value={form.children_count}
            onChange={(e) => updateField("children_count", e.target.value)}
            className={inputClass(fieldErrors.children_count)}
            aria-invalid={Boolean(fieldErrors.children_count)}
            aria-describedby={
              fieldErrors.children_count ? "inq-children-err" : undefined
            }
          />
          {fieldErrors.children_count && (
            <p id="inq-children-err" className="mt-1.5 text-xs text-gold">
              {fieldErrors.children_count}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="inq-roomtype" className={LABEL_CLASS}>
            Room Type
          </label>
          <select
            id="inq-roomtype"
            value={form.room_type_slug}
            onChange={(e) => updateField("room_type_slug", e.target.value)}
            className={inputClass(false)}
          >
            <option value="">Any / Not sure</option>
            {roomTypes.map((rt) => (
              <option key={rt.id || rt.slug} value={rt.slug}>
                {rt.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="inq-message" className={LABEL_CLASS}>
            Message
          </label>
          <textarea
            id="inq-message"
            rows={4}
            value={form.message}
            onChange={(e) => updateField("message", e.target.value)}
            className={`${inputClass(false)} resize-y`}
            placeholder="Tell us about your stay, special requests, or estimated dates."
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-7 inline-flex w-full items-center justify-center gap-2 bg-gold px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream hover:bg-gold-soft transition-colors disabled:opacity-60 disabled:cursor-not-allowed sm:w-auto"
      >
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        )}
        {isLoading ? "Sending..." : "Send Inquiry"}
      </button>
    </form>
  );
}
