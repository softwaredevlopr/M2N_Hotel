"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { listAdminHotels, formatApiError } from "@/lib/adminHotels";
import { listAdminRoomTypes } from "@/lib/adminRoomTypes";
import { clearAdminSession } from "@/lib/adminAuth";
import { useToast } from "@/components/admin/Toast";
import InventoryCalendarGrid from "@/components/admin/InventoryCalendarGrid";
import {
  aggregateDay,
  getAdminInventoryCalendar,
  monthBounds,
  monthLabel,
  shiftMonth,
  TONE_LABELS,
  TONE_STYLES,
} from "@/lib/adminInventory";

function todayUtcParts() {
  const now = new Date();
  return {
    year: now.getUTCFullYear(),
    monthIndex: now.getUTCMonth(),
  };
}

export default function AdminInventoryPage() {
  const router = useRouter();
  const toast = useToast();
  const initial = todayUtcParts();

  const [hotels, setHotels] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [hotelId, setHotelId] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [year, setYear] = useState(initial.year);
  const [monthIndex, setMonthIndex] = useState(initial.monthIndex);

  const [calendar, setCalendar] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadHotels() {
      setLoadingMeta(true);
      const result = await listAdminHotels();
      if (cancelled) return;
      if (result.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (!result.ok) {
        toast.error(formatApiError(result, "Unable to load hotels."));
        setHotels([]);
        setLoadingMeta(false);
        return;
      }
      const list = result.data?.data || [];
      setHotels(list);
      if (list.length > 0) {
        setHotelId((prev) => prev || list[0].id);
      }
      setLoadingMeta(false);
    }
    loadHotels();
    return () => {
      cancelled = true;
    };
  }, [router, toast]);

  useEffect(() => {
    let cancelled = false;
    async function loadRoomTypes() {
      if (!hotelId) {
        setRoomTypes([]);
        setRoomTypeId("");
        return;
      }
      const result = await listAdminRoomTypes({ hotel_id: hotelId });
      if (cancelled) return;
      if (result.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (!result.ok) {
        setRoomTypes([]);
        return;
      }
      const list = result.data?.data || [];
      setRoomTypes(list);
      setRoomTypeId("");
    }
    loadRoomTypes();
    return () => {
      cancelled = true;
    };
  }, [hotelId, router]);

  const { from, to } = useMemo(
    () => monthBounds(year, monthIndex),
    [year, monthIndex]
  );

  const loadCalendar = useCallback(async () => {
    if (!hotelId) {
      setCalendar(null);
      setError("");
      return;
    }

    setLoadingCalendar(true);
    setError("");
    const result = await getAdminInventoryCalendar({
      hotel_id: hotelId,
      from,
      to,
      room_type_id: roomTypeId || undefined,
    });

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      setCalendar(null);
      setError(formatApiError(result, "Unable to load inventory calendar."));
      setLoadingCalendar(false);
      return;
    }

    setCalendar(result.data?.data || null);
    setLoadingCalendar(false);
  }, [hotelId, roomTypeId, from, to, router]);

  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const dayMap = useMemo(() => {
    if (!calendar?.room_types) return {};
    const map = {};
    const { daysInMonth } = monthBounds(year, monthIndex);
    for (let day = 1; day <= daysInMonth; day += 1) {
      const iso = new Date(Date.UTC(year, monthIndex, day))
        .toISOString()
        .slice(0, 10);
      if (roomTypeId) {
        const rt = calendar.room_types.find(
          (item) => item.room_type_id === roomTypeId
        );
        map[iso] =
          (rt?.days || []).find((d) => d.date === iso) ||
          aggregateDay(calendar.room_types, iso);
      } else {
        map[iso] = aggregateDay(calendar.room_types, iso);
      }
    }
    return map;
  }, [calendar, year, monthIndex, roomTypeId]);

  const monthSummary = useMemo(() => {
    const days = Object.values(dayMap);
    if (days.length === 0) {
      return { total: 0, sold: 0, remaining: 0, occupancy: 0 };
    }
    let total = 0;
    let sold = 0;
    days.forEach((day) => {
      total += Number(day.total_rooms) || 0;
      sold += Number(day.sold_count) || 0;
    });
    const remaining = Math.max(total - sold, 0);
    const occupancy =
      total > 0 ? Math.min(100, Math.round((sold / total) * 100)) : 0;
    return { total, sold, remaining, occupancy };
  }, [dayMap]);

  function goMonth(delta) {
    const next = shiftMonth(year, monthIndex, delta);
    setYear(next.year);
    setMonthIndex(next.monthIndex);
  }

  const hotelName =
    hotels.find((h) => h.id === hotelId)?.name || calendar?.hotel_name || "—";

  return (
    <div>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Inventory
          </span>
          <div className="gold-divider mt-5" />
          <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
            Inventory Calendar
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-cream-dim">
            Monthly availability by hotel and room type. Figures come from live
            sellable rooms and inventory-blocking bookings — no schema change.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goMonth(-1)}
            className="inline-flex items-center justify-center border border-cream/30 px-3 py-3 text-cream transition-colors hover:border-gold hover:text-gold"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <div className="min-w-[10rem] text-center font-display text-xl text-cream sm:min-w-[12rem] sm:text-2xl">
            {monthLabel(year, monthIndex)}
          </div>
          <button
            type="button"
            onClick={() => goMonth(1)}
            className="inline-flex items-center justify-center border border-cream/30 px-3 py-3 text-cream transition-colors hover:border-gold hover:text-gold"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3 border border-ink-line bg-ink-soft p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
            Hotel
          </span>
          <select
            value={hotelId}
            onChange={(e) => setHotelId(e.target.value)}
            disabled={loadingMeta}
            className="w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none disabled:opacity-50"
          >
            {hotels.length === 0 ? (
              <option value="">No hotels</option>
            ) : (
              hotels.map((hotel) => (
                <option key={hotel.id} value={hotel.id}>
                  {hotel.name}
                </option>
              ))
            )}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
            Room type
          </span>
          <select
            value={roomTypeId}
            onChange={(e) => setRoomTypeId(e.target.value)}
            disabled={!hotelId}
            className="w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none disabled:opacity-50"
          >
            <option value="">All room types</option>
            {roomTypes.map((rt) => (
              <option key={rt.id} value={rt.id}>
                {rt.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="button"
            onClick={loadCalendar}
            disabled={!hotelId || loadingCalendar}
            className="inline-flex w-full items-center justify-center gap-2 border border-cream/30 px-6 py-3 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
          >
            {loadingCalendar && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            )}
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {Object.keys(TONE_LABELS).map((tone) => (
          <span
            key={tone}
            className={`inline-flex items-center gap-2 border px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase ${TONE_STYLES[tone]}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                tone === "available"
                  ? "bg-emerald-400"
                  : tone === "low"
                    ? "bg-amber-400"
                    : "bg-rose-400"
              }`}
            />
            {TONE_LABELS[tone]}
          </span>
        ))}
      </div>

      {!hotelId && !loadingMeta ? (
        <div className="mt-8 border border-ink-line bg-ink-soft p-10 text-center">
          <p className="text-sm tracking-[0.2em] uppercase text-cream-muted">
            Select a hotel to view inventory
          </p>
        </div>
      ) : error ? (
        <div
          role="alert"
          className="mt-8 border border-gold/40 bg-gold/5 p-6 text-sm text-cream-dim"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={loadCalendar}
            className="mt-4 text-[11px] tracking-[0.22em] uppercase text-gold underline-offset-4 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : loadingCalendar && !calendar ? (
        <div className="mt-8 flex items-center justify-center gap-3 border border-ink-line bg-ink-soft py-16 text-sm text-cream-muted">
          <Loader2 className="h-5 w-5 animate-spin text-gold" strokeWidth={2} />
          Loading inventory for {hotelName}…
        </div>
      ) : calendar && (calendar.room_types || []).length === 0 ? (
        <div className="mt-8 border border-ink-line bg-ink-soft p-10 text-center">
          <p className="text-sm tracking-[0.2em] uppercase text-cream-muted">
            No room types for this hotel
          </p>
          <p className="mt-3 text-sm text-cream-dim">
            Add room types in Admin → Room Types to see calendar availability.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Property", value: hotelName },
              { label: "Month capacity*", value: monthSummary.total },
              { label: "Room-nights sold*", value: monthSummary.sold },
              {
                label: "Occupancy*",
                value: `${monthSummary.occupancy}%`,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="border border-ink-line bg-ink-soft p-4"
              >
                <div className="text-[10px] tracking-[0.2em] uppercase text-cream-muted">
                  {item.label}
                </div>
                <div className="mt-2 font-display text-xl text-cream sm:text-2xl">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-cream-muted">
            * Month totals sum each day&apos;s inventory (room-nights), not a
            unique room count.
          </p>

          <div className="mt-6">
            <InventoryCalendarGrid
              year={year}
              monthIndex={monthIndex}
              dayMap={dayMap}
              loading={loadingCalendar}
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-cream-muted">
            <span>
              Viewing:{" "}
              <span className="text-cream-dim">
                {roomTypeId
                  ? roomTypes.find((rt) => rt.id === roomTypeId)?.name ||
                    "Room type"
                  : "All room types (aggregated)"}
              </span>
            </span>
            <span>
              Range:{" "}
              <span className="text-cream-dim">
                {from} → {to}
              </span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
