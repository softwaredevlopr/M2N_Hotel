"use client";

import { inventoryTone, occupancyPct, TONE_STYLES } from "@/lib/adminInventory";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Monday-first month grid. `dayMap` is ISO date → day inventory object.
 * When `selectable`, days are buttons that call `onDaySelect(iso, dayData)`.
 */
export default function InventoryCalendarGrid({
  year,
  monthIndex,
  dayMap,
  loading,
  selectable = false,
  selectedDate = null,
  onDaySelect,
}) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  // JS getUTCDay: 0=Sun … convert to Mon=0
  const startPad = (first.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells = [];

  for (let i = 0; i < startPad; i += 1) {
    cells.push({ key: `pad-${i}`, empty: true });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const iso = new Date(Date.UTC(year, monthIndex, day))
      .toISOString()
      .slice(0, 10);
    cells.push({
      key: iso,
      empty: false,
      day,
      iso,
      data: dayMap[iso] || null,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ key: `trail-${cells.length}`, empty: true });
  }

  return (
    <div className="overflow-x-auto border border-ink-line">
      <div className="grid min-w-[720px] grid-cols-7 bg-ink-soft">
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            className="border-b border-ink-line px-2 py-3 text-center text-[10px] tracking-[0.22em] uppercase text-gold"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid min-w-[720px] grid-cols-7">
        {cells.map((cell) => {
          if (cell.empty) {
            return (
              <div
                key={cell.key}
                className="min-h-[7.5rem] border-b border-r border-ink-line bg-ink/40"
              />
            );
          }

          if (loading || !cell.data) {
            return (
              <div
                key={cell.key}
                className="min-h-[7.5rem] border-b border-r border-ink-line bg-ink-soft/40 p-2"
              >
                <div className="text-xs text-cream-muted">{cell.day}</div>
                <div className="mt-6 h-2 w-10 animate-pulse bg-ink-line" />
              </div>
            );
          }

          const tone = inventoryTone(cell.data);
          const occ = occupancyPct(cell.data);
          const selected = selectedDate === cell.iso;
          const hasOverride = Boolean(cell.data.has_override);
          const customOverride =
            hasOverride &&
            ((cell.data.allotment !== null &&
              cell.data.allotment !== undefined) ||
              Boolean(cell.data.stop_sell) ||
              Number(cell.data.overbooking_allowance) > 0);

          const className = `min-h-[7.5rem] w-full border-b border-r border-ink-line p-2 text-left transition-colors sm:p-2.5 ${TONE_STYLES[tone]} ${
            selectable ? "cursor-pointer focus:outline-none focus:ring-1 focus:ring-gold/60" : ""
          } ${selected ? "ring-1 ring-inset ring-gold" : ""}`;

          const content = (
            <>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-cream">{cell.day}</span>
                <span className="text-[10px] tracking-[0.15em] uppercase text-cream-muted">
                  {occ}%
                </span>
              </div>
              {(cell.data.stop_sell || hasOverride) && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {cell.data.stop_sell ? (
                    <span className="text-[9px] tracking-[0.14em] uppercase text-rose-200">
                      Stop-sell
                    </span>
                  ) : null}
                  {!cell.data.stop_sell && customOverride ? (
                    <span className="text-[9px] tracking-[0.14em] uppercase text-gold">
                      Override
                    </span>
                  ) : null}
                  {!cell.data.stop_sell && hasOverride && !customOverride ? (
                    <span className="text-[9px] tracking-[0.14em] uppercase text-cream-muted">
                      Row
                    </span>
                  ) : null}
                </div>
              )}
              <dl className="mt-2 space-y-0.5 text-[11px] leading-snug text-cream-dim">
                <div className="flex justify-between gap-2">
                  <dt>Total</dt>
                  <dd className="text-cream">{cell.data.total_rooms}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Booked</dt>
                  <dd className="text-cream">{cell.data.sold_count}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Left</dt>
                  <dd className="text-cream">{cell.data.remaining_count}</dd>
                </div>
              </dl>
            </>
          );

          if (selectable) {
            return (
              <button
                key={cell.key}
                type="button"
                className={className}
                onClick={() => onDaySelect?.(cell.iso, cell.data)}
                aria-pressed={selected}
                aria-label={`Edit inventory for ${cell.iso}`}
              >
                {content}
              </button>
            );
          }

          return (
            <div key={cell.key} className={className}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
