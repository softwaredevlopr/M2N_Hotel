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

        <div className="sm:col-span-2 border border-ink-line bg-ink-soft p-5">
          <h4 className="text-[11px] tracking-[0.25em] uppercase text-gold">
            Communication preferences
          </h4>
          <p className="mt-3 text-xs leading-relaxed text-cream-muted">
            Booking confirmation and cancellation emails are always sent to the
            address above. The options below control optional status and stay
            update messages only.
          </p>
          <div className="mt-4 space-y-3">
            <label className="flex items-start gap-3 text-sm text-cream-dim">
              <input
                type="checkbox"
                checked={Boolean(values.emailUpdates)}
                onChange={(event) =>
                  onChange("emailUpdates", event.target.checked)
                }
                className="mt-0.5 h-4 w-4 accent-gold"
              />
              <span>
                Email me about booking status and stay changes
                <span className="mt-1 block text-xs text-cream-muted">
                  Turn off to skip optional update emails (confirm and cancel
                  still send).
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-cream-dim">
              <input
                type="checkbox"
                checked={Boolean(values.smsOptIn)}
                onChange={(event) => onChange("smsOptIn", event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-gold"
              />
              <span>
                SMS updates (coming soon)
                <span className="mt-1 block text-xs text-cream-muted">
                  Preference is saved; SMS delivery is not active yet.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm text-cream-dim">
              <input
                type="checkbox"
                checked={Boolean(values.whatsappOptIn)}
                onChange={(event) =>
                  onChange("whatsappOptIn", event.target.checked)
                }
                className="mt-0.5 h-4 w-4 accent-gold"
              />
              <span>
                WhatsApp updates (coming soon)
                <span className="mt-1 block text-xs text-cream-muted">
                  Preference is saved; WhatsApp delivery is not active yet.
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
