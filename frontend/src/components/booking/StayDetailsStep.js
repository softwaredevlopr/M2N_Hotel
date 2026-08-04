"use client";

import { Check, MapPin, Star } from "lucide-react";
import { formatLocation, formatPrice } from "@/lib/format";
import {
  MAX_ADULTS,
  MAX_CHILDREN,
  MAX_ROOMS,
  todayIso,
} from "@/lib/bookingPricing";
import { LABEL_CLASS, inputClass } from "./formStyles";

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 text-xs text-gold">
      {message}
    </p>
  );
}

function startingRate(roomTypes = []) {
  const prices = roomTypes
    .map((roomType) => Number(roomType?.base_price))
    .filter((price) => Number.isFinite(price) && price > 0);
  return prices.length > 0 ? Math.min(...prices) : null;
}

export default function StayDetailsStep({
  hotels,
  roomTypesByHotel,
  hotelImages,
  values,
  errors,
  onChange,
  onSelectHotel,
}) {
  const minCheckIn = todayIso();

  return (
    <div className="space-y-10">
      <section>
        <h3 className="text-xs tracking-[0.35em] uppercase text-gold">
          Select a Hotel
        </h3>
        <div className="gold-divider mt-4" />

        {hotels.length === 0 ? (
          <p className="mt-6 border border-ink-line bg-ink-soft p-8 text-center text-sm tracking-[0.2em] uppercase text-cream-muted">
            Hotels will appear here once available.
          </p>
        ) : (
          <fieldset className="mt-6">
            <legend className="sr-only">Select a hotel</legend>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {hotels.map((hotel) => {
                const isSelected = hotel.slug === values.hotelSlug;
                const location = formatLocation(hotel);
                const from = startingRate(roomTypesByHotel[hotel.slug]);

                return (
                  <button
                    key={hotel.id || hotel.slug}
                    type="button"
                    onClick={() => onSelectHotel(hotel.slug)}
                    aria-pressed={isSelected}
                    className={`group flex flex-col overflow-hidden border text-left transition-colors ${
                      isSelected
                        ? "border-gold bg-ink-elevated"
                        : "border-ink-line bg-ink-soft hover:border-gold/50"
                    }`}
                  >
                    <div className="relative aspect-[16/9] overflow-hidden">
                      <img
                        src={hotelImages[hotel.slug]}
                        alt={`${hotel.name}${location ? ` — ${location}` : ""}`}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent" />
                      {isSelected && (
                        <span className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center bg-gold text-cream">
                          <Check className="h-4 w-4" strokeWidth={2} />
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-6">
                      <div className="flex items-start justify-between gap-4">
                        <h4 className="font-display text-xl text-cream sm:text-2xl">
                          {hotel.name}
                        </h4>
                        {hotel.star_rating && (
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs tracking-[0.2em] uppercase text-cream-muted">
                            <Star className="h-3.5 w-3.5 fill-gold text-gold" />
                            {hotel.star_rating}★
                          </span>
                        )}
                      </div>

                      {location && (
                        <p className="mt-3 inline-flex items-center gap-2 text-xs tracking-[0.2em] uppercase text-cream-muted">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-gold" />
                          {location}
                        </p>
                      )}

                      <p className="mt-4 text-sm text-cream-dim">
                        {from
                          ? `From ${formatPrice(from, hotel.currency_code || "INR")}`
                          : "Rates on request"}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}
        {errors.hotelSlug && (
          <p className="mt-4 text-xs text-gold">{errors.hotelSlug}</p>
        )}
      </section>

      <section>
        <h3 className="text-xs tracking-[0.35em] uppercase text-gold">
          Stay Dates & Guests
        </h3>
        <div className="gold-divider mt-4" />

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="bk-check-in" className={LABEL_CLASS}>
              Check-in <span className="text-gold">*</span>
            </label>
            <input
              id="bk-check-in"
              type="date"
              min={minCheckIn}
              value={values.checkIn}
              onChange={(event) => onChange("checkIn", event.target.value)}
              className={inputClass(errors.checkIn)}
              aria-invalid={Boolean(errors.checkIn)}
              aria-describedby={errors.checkIn ? "bk-check-in-err" : undefined}
            />
            <FieldError id="bk-check-in-err" message={errors.checkIn} />
          </div>

          <div>
            <label htmlFor="bk-check-out" className={LABEL_CLASS}>
              Check-out <span className="text-gold">*</span>
            </label>
            <input
              id="bk-check-out"
              type="date"
              min={values.checkIn || minCheckIn}
              value={values.checkOut}
              onChange={(event) => onChange("checkOut", event.target.value)}
              className={inputClass(errors.checkOut)}
              aria-invalid={Boolean(errors.checkOut)}
              aria-describedby={errors.checkOut ? "bk-check-out-err" : undefined}
            />
            <FieldError id="bk-check-out-err" message={errors.checkOut} />
          </div>

          <div>
            <label htmlFor="bk-adults" className={LABEL_CLASS}>
              Adults <span className="text-gold">*</span>
            </label>
            <input
              id="bk-adults"
              type="number"
              min={1}
              max={MAX_ADULTS}
              value={values.adults}
              onChange={(event) => onChange("adults", event.target.value)}
              className={inputClass(errors.adults)}
              aria-invalid={Boolean(errors.adults)}
              aria-describedby={errors.adults ? "bk-adults-err" : undefined}
            />
            <FieldError id="bk-adults-err" message={errors.adults} />
          </div>

          <div>
            <label htmlFor="bk-children" className={LABEL_CLASS}>
              Children
            </label>
            <input
              id="bk-children"
              type="number"
              min={0}
              max={MAX_CHILDREN}
              value={values.children}
              onChange={(event) => onChange("children", event.target.value)}
              className={inputClass(errors.children)}
              aria-invalid={Boolean(errors.children)}
              aria-describedby={errors.children ? "bk-children-err" : undefined}
            />
            <FieldError id="bk-children-err" message={errors.children} />
          </div>

          <div>
            <label htmlFor="bk-rooms" className={LABEL_CLASS}>
              Rooms <span className="text-gold">*</span>
            </label>
            <input
              id="bk-rooms"
              type="number"
              min={1}
              max={MAX_ROOMS}
              value={values.rooms}
              onChange={(event) => onChange("rooms", event.target.value)}
              className={inputClass(errors.rooms)}
              aria-invalid={Boolean(errors.rooms)}
              aria-describedby={errors.rooms ? "bk-rooms-err" : undefined}
            />
            <FieldError id="bk-rooms-err" message={errors.rooms} />
          </div>
        </div>
      </section>
    </div>
  );
}
