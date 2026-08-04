"use client";

import { LABEL_CLASS, inputClass } from "./formStyles";

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-gold">
      {message}
    </p>
  );
}

export default function GuestDetailsStep({ values, errors, onChange }) {
  return (
    <section>
      <h3 className="text-xs tracking-[0.35em] uppercase text-gold">
        Guest Details
      </h3>
      <div className="gold-divider mt-4" />
      <p className="mt-6 text-sm leading-relaxed text-cream-dim">
        We use these details to confirm your reservation. Your booking reference
        and this contact information are what you will need to look the booking
        up later.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="bk-name" className={LABEL_CLASS}>
            Full Name <span className="text-gold">*</span>
          </label>
          <input
            id="bk-name"
            type="text"
            value={values.guestName}
            onChange={(event) => onChange("guestName", event.target.value)}
            className={inputClass(errors.guestName)}
            placeholder="Your full name"
            autoComplete="name"
            aria-invalid={Boolean(errors.guestName)}
            aria-describedby={errors.guestName ? "bk-name-err" : undefined}
          />
          <FieldError id="bk-name-err" message={errors.guestName} />
        </div>

        <div>
          <label htmlFor="bk-phone" className={LABEL_CLASS}>
            Mobile Number <span className="text-gold">*</span>
          </label>
          <input
            id="bk-phone"
            type="tel"
            value={values.guestPhone}
            onChange={(event) => onChange("guestPhone", event.target.value)}
            className={inputClass(errors.guestPhone)}
            placeholder="10-digit mobile or +91…"
            autoComplete="tel"
            inputMode="tel"
            aria-invalid={Boolean(errors.guestPhone)}
            aria-describedby={errors.guestPhone ? "bk-phone-err" : undefined}
          />
          <FieldError id="bk-phone-err" message={errors.guestPhone} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="bk-email" className={LABEL_CLASS}>
            Email <span className="text-gold">*</span>
          </label>
          <input
            id="bk-email"
            type="email"
            value={values.guestEmail}
            onChange={(event) => onChange("guestEmail", event.target.value)}
            className={inputClass(errors.guestEmail)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={Boolean(errors.guestEmail)}
            aria-describedby={errors.guestEmail ? "bk-email-err" : undefined}
          />
          <FieldError id="bk-email-err" message={errors.guestEmail} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="bk-requests" className={LABEL_CLASS}>
            Special Request
          </label>
          <textarea
            id="bk-requests"
            rows={4}
            maxLength={2000}
            value={values.specialRequests}
            onChange={(event) => onChange("specialRequests", event.target.value)}
            className={`${inputClass(errors.specialRequests)} resize-y`}
            placeholder="Airport pickup, early check-in, preferred floor, dietary needs."
            aria-invalid={Boolean(errors.specialRequests)}
            aria-describedby={
              errors.specialRequests ? "bk-requests-err" : undefined
            }
          />
          <FieldError id="bk-requests-err" message={errors.specialRequests} />
        </div>
      </div>
    </section>
  );
}
