"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  formatApiError,
  guestProfileHref,
  listAdminGuests,
} from "@/lib/adminGuests";
import { listAdminHotels } from "@/lib/adminHotels";
import { clearAdminSession } from "@/lib/adminAuth";
import { useToast } from "@/components/admin/Toast";

const PAGE_SIZE = 20;

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminGuestsPage() {
  return (
    <Suspense
      fallback={
        <p className="inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading…
        </p>
      }
    >
      <AdminGuestsPageInner />
    </Suspense>
  );
}

function AdminGuestsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialHotel = searchParams.get("hotel_id") || "";
  const initialQ = searchParams.get("q") || "";

  const [hotels, setHotels] = useState([]);
  const [hotelId, setHotelId] = useState(initialHotel);
  const [loadingHotels, setLoadingHotels] = useState(true);

  const [q, setQ] = useState(initialQ);
  const [appliedQ, setAppliedQ] = useState(initialQ);
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const selectedHotel = useMemo(
    () => hotels.find((hotel) => hotel.id === hotelId) || null,
    [hotels, hotelId]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadHotels() {
      setLoadingHotels(true);
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
        setLoadingHotels(false);
        return;
      }
      const list = result.data?.data || [];
      setHotels(list);
      setHotelId((prev) =>
        prev && list.some((hotel) => hotel.id === prev) ? prev : ""
      );
      setLoadingHotels(false);
    }
    loadHotels();
    return () => {
      cancelled = true;
    };
  }, [router, toast]);

  const loadGuests = useCallback(async () => {
    if (!hotelId) {
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await listAdminGuests({
      hotel_id: hotelId,
      q: appliedQ.trim() || undefined,
      limit: PAGE_SIZE,
      offset,
    });
    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to load guests."));
      setRows([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const payload = result.data || {};
    setRows(payload.data || []);
    setTotal(Number(payload.total) || 0);
    setLoading(false);
  }, [appliedQ, hotelId, offset, router, toast]);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  function replaceQuery(nextHotelId, nextQ) {
    const params = new URLSearchParams();
    if (nextHotelId) params.set("hotel_id", nextHotelId);
    if (nextQ) params.set("q", nextQ);
    const qs = params.toString();
    router.replace(qs ? `/admin/guests?${qs}` : "/admin/guests", {
      scroll: false,
    });
  }

  function handleHotelChange(nextId) {
    setHotelId(nextId);
    setOffset(0);
    replaceQuery(nextId, appliedQ.trim());
  }

  function handleSearch(event) {
    event.preventDefault();
    const nextQ = q.trim();
    setAppliedQ(nextQ);
    setOffset(0);
    replaceQuery(hotelId, nextQ);
  }

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <span className="text-xs tracking-[0.45em] uppercase text-gold">
        Guests
      </span>
      <div className="gold-divider mt-5" />
      <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
        Guests
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-dim">
        Hotel-scoped guest 360 derived from existing bookings and inquiries.
        Guests with the same email at this hotel are grouped; different emails
        are never merged, even when phone numbers match.
      </p>

      <form
        onSubmit={handleSearch}
        className="mt-10 grid grid-cols-1 gap-3 border border-ink-line bg-ink-soft p-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <label className="block">
          <span className="mb-2 block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
            Hotel
          </span>
          <select
            value={hotelId}
            onChange={(e) => handleHotelChange(e.target.value)}
            disabled={loadingHotels}
            className="w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none disabled:opacity-50"
          >
            <option value="">Select a hotel…</option>
            {hotels.map((hotel) => (
              <option key={hotel.id} value={hotel.id}>
                {hotel.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="mb-2 block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
            Search
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, or phone"
            className="w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
          />
        </label>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!hotelId}
            className="w-full bg-gold px-5 py-3 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </form>

      {!hotelId ? (
        <p className="mt-10 text-sm text-cream-muted">
          {loadingHotels
            ? "Loading hotels…"
            : hotels.length === 0
              ? "No hotels are available yet."
              : "Select a hotel to view derived guest records for that property."}
        </p>
      ) : loading ? (
        <p className="mt-10 inline-flex items-center gap-2 text-sm text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading {selectedHotel?.name || "hotel"} guests…
        </p>
      ) : (
        <div className="mt-8 border border-ink-line bg-ink-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-ink-line text-[10px] tracking-[0.2em] uppercase text-cream-muted">
                  <th className="px-4 py-3 font-normal">Guest</th>
                  <th className="px-4 py-3 font-normal">Contact</th>
                  <th className="px-4 py-3 font-normal">History</th>
                  <th className="px-4 py-3 font-normal">Last activity</th>
                  <th className="px-4 py-3 font-normal" />
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-sm text-cream-muted"
                    >
                      No guests found for this hotel
                      {appliedQ ? " matching that search" : ""}.
                    </td>
                  </tr>
                ) : (
                  rows.map((guest) => (
                    <tr
                      key={guest.identity_key}
                      className="border-t border-ink-line transition-colors hover:bg-ink/60"
                    >
                      <td className="px-4 py-4">
                        <div className="text-sm text-cream">
                          {guest.display_name || "Guest"}
                        </div>
                        {guest.is_repeat_guest ? (
                          <div className="mt-1 text-[10px] tracking-[0.16em] uppercase text-gold">
                            Repeat guest
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-sm text-cream-dim">
                        <div>{guest.email || "No email"}</div>
                        <div className="mt-1 text-xs text-cream-muted">
                          {guest.phone || "No phone"}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-cream-dim">
                        {guest.booking_count} booking
                        {guest.booking_count === 1 ? "" : "s"}
                        <div className="mt-1 text-xs text-cream-muted">
                          {guest.inquiry_count} inquir
                          {guest.inquiry_count === 1 ? "y" : "ies"}
                          {guest.stay_count
                            ? ` · ${guest.stay_count} stay${
                                guest.stay_count === 1 ? "" : "s"
                              }`
                            : ""}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-cream-muted">
                        {formatDateTime(guest.last_activity_at)}
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={guestProfileHref(hotelId, guest.identity_key)}
                          className="text-[11px] tracking-[0.2em] uppercase text-gold hover:text-cream"
                        >
                          View 360
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {total > PAGE_SIZE ? (
            <div className="flex items-center justify-between border-t border-ink-line px-4 py-3 text-xs text-cream-muted">
              <span>
                Page {page} of {pageCount} · {total} guests
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={offset === 0}
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  className="border border-ink-line px-3 py-2 uppercase tracking-[0.16em] text-cream hover:border-gold disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={offset + PAGE_SIZE >= total}
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  className="border border-ink-line px-3 py-2 uppercase tracking-[0.16em] text-cream hover:border-gold disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
