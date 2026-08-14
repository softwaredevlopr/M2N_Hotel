"use client";

import { AlertCircle, BedDouble, Check, Loader2, Users } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { occupancyExceeded } from "@/lib/bookingPricing";
import { SECONDARY_BUTTON_CLASS } from "./formStyles";

export default function AvailableRoomsStep({
  hotel,
  roomImages = {},
  preferredRoomTypeSlug = "",
  options = [],
  selectedRoomTypeId = "",
  guestCount = 0,
  rooms = 1,
  loading = false,
  error = null,
  onSelect,
  onRetry,
  onChangeDates,
}) {
  const currency = hotel?.currency_code || "INR";
  const available = options.filter((item) => item.is_available);
  const preferred = preferredRoomTypeSlug
    ? options.find((item) => item.slug === preferredRoomTypeSlug)
    : null;
  const preferredUnavailable = Boolean(preferred && !preferred.is_available);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 border border-ink-line bg-ink-soft px-6 py-16 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold" strokeWidth={1.5} />
        <p className="text-sm tracking-[0.2em] uppercase text-cream-muted">
          Checking availability…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="border border-gold/40 bg-gold/5 p-6 text-sm text-cream-dim"
      >
        <div className="flex gap-3">
          <AlertCircle
            className="h-5 w-5 shrink-0 text-gold"
            strokeWidth={1.5}
          />
          <div>
            <p>{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-4 text-xs tracking-[0.25em] uppercase text-gold underline-offset-4 hover:underline"
              >
                Try again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (available.length === 0) {
    const preferredName = preferred?.name;
    return (
      <div className="border border-ink-line bg-ink-soft p-8 text-center">
        <p className="text-sm leading-relaxed text-cream-dim">
          {preferredName
            ? `${preferredName} is not available for these dates${
                hotel?.name ? ` at ${hotel.name}` : ""
              }. No other rooms are open either — try different dates.`
            : `No rooms are available for these dates${
                hotel?.name ? ` at ${hotel.name}` : ""
              }. Try different dates or another property.`}
        </p>
        {onChangeDates && (
          <button
            type="button"
            onClick={onChangeDates}
            className={`${SECONDARY_BUTTON_CLASS} mt-6 w-full sm:w-auto`}
          >
            Change dates
          </button>
        )}
      </div>
    );
  }

  return (
    <section>
      <h3 className="text-xs tracking-[0.35em] uppercase text-gold">
        Available Rooms
      </h3>
      <div className="gold-divider mt-4" />
      <p className="mt-6 text-sm leading-relaxed text-cream-dim">
        Showing room types with inventory for your stay. Select one option to
        continue.
      </p>

      {preferredUnavailable && (
        <p
          role="status"
          className="mt-5 border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
        >
          {preferred.name} is not available for these dates. Choose another
          room below, or{" "}
          {onChangeDates ? (
            <button
              type="button"
              onClick={onChangeDates}
              className="text-gold underline-offset-4 hover:underline"
            >
              change dates
            </button>
          ) : (
            "change dates"
          )}
          .
        </p>
      )}

      <fieldset className="mt-6 space-y-4">
        <legend className="sr-only">Available room types</legend>
        {available.map((option) => {
          const isSelected = option.room_type_id === selectedRoomTypeId;
          const isPreferred =
            preferredRoomTypeSlug && option.slug === preferredRoomTypeSlug;
          const imageSrc = roomImages[option.slug];
          const overCapacity = occupancyExceeded({
            adults: guestCount,
            children: 0,
            rooms,
            maxOccupancy: option.max_occupancy,
          });

          return (
            <button
              key={option.room_type_id}
              type="button"
              onClick={() => onSelect(option)}
              aria-pressed={isSelected}
              className={`flex w-full flex-col overflow-hidden border text-left transition-colors sm:flex-row ${
                isSelected
                  ? "border-gold bg-ink-elevated"
                  : "border-ink-line bg-ink-soft hover:border-gold/50"
              }`}
            >
              <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden sm:aspect-auto sm:w-52 sm:self-stretch">
                {imageSrc ? (
                  <img
                    src={imageSrc}
                    alt={option.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full min-h-[9rem] items-center justify-center bg-ink text-cream-muted">
                    <BedDouble className="h-8 w-8" strokeWidth={1.25} />
                  </div>
                )}
                {isSelected && (
                  <span className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center bg-gold text-cream">
                    <Check className="h-4 w-4" strokeWidth={2} />
                  </span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-3 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="font-display text-xl text-cream">
                      {option.name}
                    </h4>
                    {isPreferred && (
                      <p className="mt-1 text-[11px] tracking-[0.2em] uppercase text-gold">
                        You selected this room
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {option.on_request ? (
                      <p className="text-xs tracking-[0.2em] uppercase text-gold">
                        On request
                      </p>
                    ) : (
                      <>
                        <p className="font-display text-xl text-gold">
                          {formatPrice(option.nightly_rate, currency)}
                        </p>
                        <p className="text-[11px] tracking-[0.15em] uppercase text-cream-muted">
                          per night
                        </p>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs tracking-[0.15em] uppercase text-cream-muted">
                  {option.max_occupancy ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-gold" strokeWidth={1.5} />
                      Up to {option.max_occupancy} guests
                    </span>
                  ) : null}
                  {option.bed_type ? (
                    <span className="inline-flex items-center gap-1.5">
                      <BedDouble
                        className="h-3.5 w-3.5 text-gold"
                        strokeWidth={1.5}
                      />
                      {option.bed_type}
                    </span>
                  ) : null}
                  <span>
                    {option.available_rooms} available
                    {option.available_rooms === 1 ? " room" : " rooms"}
                  </span>
                </div>

                {overCapacity && (
                  <p className="text-xs text-gold">
                    Guest count exceeds this room type’s capacity for the
                    rooms selected.
                  </p>
                )}

                <div className="mt-auto border-t border-ink-line/70 pt-3 text-sm text-cream-dim">
                  {option.on_request ? (
                    <p>Stay total confirmed by our team.</p>
                  ) : (
                    <dl className="space-y-1">
                      <div className="flex justify-between gap-4">
                        <dt>Stay subtotal</dt>
                        <dd>{formatPrice(option.subtotal, currency)}</dd>
                      </div>
                      <div className="flex justify-between gap-4 text-cream-muted">
                        <dt>Taxes / fees</dt>
                        <dd>
                          {Number(option.tax_amount) > 0
                            ? formatPrice(option.tax_amount, currency)
                            : "As applicable at property"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4 font-medium text-cream">
                        <dt>Estimated stay total</dt>
                        <dd>{formatPrice(option.total_amount, currency)}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </fieldset>
    </section>
  );
}
