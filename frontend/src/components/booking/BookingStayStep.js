"use client";

import { AlertCircle, BedDouble, Check, Info, Users } from "lucide-react";
import { formatPrice } from "@/lib/format";
import {
  MAX_ADULTS,
  MAX_CHILDREN,
  MAX_ROOMS,
  countSellableRooms,
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

export default function BookingStayStep({
  hotel,
  roomTypes,
  rooms,
  roomImages,
  values,
  errors,
  onChange,
}) {
  const currency = hotel?.currency_code || "INR";
  const minCheckIn = todayIso();

  return (
    <div className="space-y-10">
      <section>
        <h3 className="text-xs tracking-[0.35em] uppercase text-gold">
          Select a Room
        </h3>
        <div className="gold-divider mt-4" />

        {roomTypes.length === 0 ? (
          <p className="mt-6 border border-ink-line bg-ink-soft p-6 text-sm text-cream-dim">
            No rooms are published for this property yet. Please choose another
            hotel or send us an inquiry and we will assist you directly.
          </p>
        ) : (
          <fieldset className="mt-6">
            <legend className="sr-only">Room type</legend>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {roomTypes.map((roomType) => {
                const isSelected = roomType.slug === values.roomTypeSlug;
                const inventory = countSellableRooms(rooms, roomType.slug);
                const soldOut = inventory === 0;
                const price = Number(roomType.base_price);

                return (
                  <button
                    key={roomType.id || roomType.slug}
                    type="button"
                    disabled={soldOut}
                    onClick={() => onChange("roomTypeSlug", roomType.slug)}
                    aria-pressed={isSelected}
                    className={`flex gap-4 border p-4 text-left transition-colors ${
                      soldOut
                        ? "cursor-not-allowed border-ink-line bg-ink-soft/50 opacity-60"
                        : isSelected
                        ? "border-gold bg-ink-elevated"
                        : "border-ink-line bg-ink-soft hover:border-gold/50"
                    }`}
                  >
                    <img
                      src={roomImages[roomType.slug]}
                      alt={roomType.name}
                      loading="lazy"
                      decoding="async"
                      className="h-24 w-24 shrink-0 object-cover sm:h-28 sm:w-32"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="font-display text-lg text-cream">
                          {roomType.name}
                        </h4>
                        {isSelected && (
                          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center bg-gold text-cream">
                            <Check className="h-3.5 w-3.5" strokeWidth={2} />
                          </span>
                        )}
                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] tracking-[0.15em] uppercase text-cream-muted">
                        {roomType.bed_type && (
                          <span className="inline-flex items-center gap-1.5">
                            <BedDouble className="h-3.5 w-3.5 text-gold" />
                            {roomType.bed_type}
                          </span>
                        )}
                        {roomType.max_occupancy && (
                          <span className="inline-flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-gold" />
                            Up to {roomType.max_occupancy}
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-sm text-gold">
                        {Number.isFinite(price) && price > 0
                          ? `${formatPrice(price, currency)} / night`
                          : "Rate on request"}
                      </p>

                      <p className="mt-1 text-[11px] tracking-[0.15em] uppercase text-cream-muted">
                        {soldOut
                          ? "Currently unavailable"
                          : `${inventory} room${inventory === 1 ? "" : "s"} at this property`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <FieldError id="room-type-err" message={errors.roomTypeSlug} />
          </fieldset>
        )}
      </section>

      <section>
        <h3 className="text-xs tracking-[0.35em] uppercase text-gold">
          Dates &amp; Guests
        </h3>
        <div className="gold-divider mt-4" />

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="bk-checkin" className={LABEL_CLASS}>
              Check-in <span className="text-gold">*</span>
            </label>
            <input
              id="bk-checkin"
              type="date"
              min={minCheckIn}
              value={values.checkIn}
              onChange={(event) => onChange("checkIn", event.target.value)}
              className={inputClass(errors.checkIn)}
              aria-invalid={Boolean(errors.checkIn)}
              aria-describedby={errors.checkIn ? "bk-checkin-err" : undefined}
            />
            <FieldError id="bk-checkin-err" message={errors.checkIn} />
          </div>

          <div>
            <label htmlFor="bk-checkout" className={LABEL_CLASS}>
              Check-out <span className="text-gold">*</span>
            </label>
            <input
              id="bk-checkout"
              type="date"
              min={values.checkIn || minCheckIn}
              value={values.checkOut}
              onChange={(event) => onChange("checkOut", event.target.value)}
              className={inputClass(errors.checkOut)}
              aria-invalid={Boolean(errors.checkOut)}
              aria-describedby={errors.checkOut ? "bk-checkout-err" : undefined}
            />
            <FieldError id="bk-checkout-err" message={errors.checkOut} />
          </div>

          <div>
            <label htmlFor="bk-adults" className={LABEL_CLASS}>
              Adults <span className="text-gold">*</span>
            </label>
            <input
              id="bk-adults"
              type="number"
              min="1"
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
              min="0"
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
              min="1"
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

        {errors.availability && (
          <p
            role="alert"
            className="mt-5 flex gap-3 border border-gold/40 bg-gold/5 p-4 text-xs leading-relaxed text-cream-dim"
          >
            <AlertCircle className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
            {errors.availability}
          </p>
        )}

        {errors.occupancyNotice && (
          <p className="mt-5 flex gap-3 border border-ink-line bg-ink-soft p-4 text-xs leading-relaxed text-cream-dim">
            <Info className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} />
            {errors.occupancyNotice}
          </p>
        )}
      </section>
    </div>
  );
}
