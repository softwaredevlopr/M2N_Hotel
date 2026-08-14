"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { rememberBookingContact } from "@/lib/bookingSession";
import {
  LABEL_CLASS,
  PRIMARY_BUTTON_CLASS,
  inputClass,
} from "@/components/booking/formStyles";

export default function FindBookingForm() {
  const router = useRouter();
  const [bookingNumber, setBookingNumber] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(event) {
    event.preventDefault();
    const number = bookingNumber.trim();
    const proof = contact.trim();
    if (!number) {
      setError("Enter your booking reference.");
      return;
    }
    if (!proof) {
      setError("Enter the email or mobile number used for the booking.");
      return;
    }

    setSubmitting(true);
    const isEmail = proof.includes("@");
    rememberBookingContact(number, {
      email: isEmail ? proof : "",
      phone: isEmail ? "" : proof,
    });
    router.push(`/booking/${encodeURIComponent(number)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8" noValidate>
      {error ? (
        <p role="alert" className="mb-5 text-sm text-gold">
          {error}
        </p>
      ) : null}
      <div>
        <label htmlFor="find-ref" className={LABEL_CLASS}>
          Booking reference
        </label>
        <input
          id="find-ref"
          type="text"
          value={bookingNumber}
          onChange={(event) => {
            setBookingNumber(event.target.value);
            setError("");
          }}
          className={inputClass(Boolean(error) && !bookingNumber.trim())}
          placeholder="M2N-YYYYMMDD-XXXXX"
          autoComplete="off"
        />
      </div>
      <div className="mt-5">
        <label htmlFor="find-contact" className={LABEL_CLASS}>
          Email or mobile number
        </label>
        <input
          id="find-contact"
          type="text"
          value={contact}
          onChange={(event) => {
            setContact(event.target.value);
            setError("");
          }}
          className={inputClass(Boolean(error) && !contact.trim())}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className={`${PRIMARY_BUTTON_CLASS} mt-6 w-full sm:w-auto`}
      >
        {submitting && (
          <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
        )}
        {submitting ? "Opening…" : "View booking"}
      </button>
    </form>
  );
}
