"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2 } from "lucide-react";
import {
  BOOKING_SORT_FIELDS,
  BOOKING_STATUSES,
  formatApiError,
  listAdminBookings,
} from "@/lib/adminBookings";
import { listAdminHotels } from "@/lib/adminHotels";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/Toast";
import { formatPrice } from "@/lib/format";

const PAGE_SIZE = 20;

const SORT_LABELS = {
  created_at: "Created",
  check_in_date: "Check-in",
  check_out_date: "Check-out",
  guest_name: "Guest",
  booking_status: "Status",
  total_amount: "Total",
  booking_number: "Reference",
};

function formatDate(iso) {
  if (!iso) return "—";
  return String(iso).slice(0, 10);
}

export default function AdminBookingsPage() {
  return (
    <Suspense
      fallback={
        <p className="inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading…
        </p>
      }
    >
      <AdminBookingsPageInner />
    </Suspense>
  );
}

function AdminBookingsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialStatus = searchParams.get("status") || "";
  const initialHotel = searchParams.get("hotel_id") || "";

  const [bookings, setBookings] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [hotelId, setHotelId] = useState(initialHotel);
  const [status, setStatus] = useState(
    BOOKING_STATUSES.includes(initialStatus) ? initialStatus : ""
  );
  const [checkInFrom, setCheckInFrom] = useState("");
  const [checkInTo, setCheckInTo] = useState("");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState("desc");
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadHotels() {
      const result = await listAdminHotels();
      if (cancelled) return;
      if (result.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (result.ok) setHotels(result.data?.data || []);
    }
    loadHotels();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAdminBookings({
      search: appliedQ.trim() || undefined,
      hotel_id: hotelId || undefined,
      booking_status: status || undefined,
      check_in_from: checkInFrom || undefined,
      check_in_to: checkInTo || undefined,
      sort,
      order,
      limit: PAGE_SIZE,
      offset,
    });

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to load bookings."));
      setBookings([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setBookings(result.data?.data || []);
    setTotal(Number(result.data?.total) || 0);
    setLoading(false);
  }, [
    appliedQ,
    hotelId,
    status,
    checkInFrom,
    checkInTo,
    sort,
    order,
    offset,
    router,
    toast,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(event) {
    event.preventDefault();
    setOffset(0);
    setAppliedQ(q);
  }

  function toggleSort(field) {
    setOffset(0);
    if (sort === field) {
      setOrder((prev) => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setSort(field);
    setOrder(field === "guest_name" || field === "booking_number" ? "asc" : "desc");
  }

  const pageStart = total === 0 ? 0 : offset + 1;
  const pageEnd = Math.min(offset + PAGE_SIZE, total);
  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <div>
      <div>
        <span className="text-xs tracking-[0.45em] uppercase text-gold">
          Bookings
        </span>
        <div className="gold-divider mt-5" />
        <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
          Booking Management
        </h1>
        <p className="mt-3 text-sm text-cream-dim">
          Search, filter, and manage guest reservations across properties.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-10 grid grid-cols-1 gap-3 border border-ink-line bg-ink-soft p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search reference, guest, email, phone…"
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:border-gold focus:outline-none sm:col-span-2"
        />
        <select
          value={hotelId}
          onChange={(e) => {
            setOffset(0);
            setHotelId(e.target.value);
          }}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All hotels</option>
          {hotels.map((hotel) => (
            <option key={hotel.id} value={hotel.id}>
              {hotel.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setOffset(0);
            setStatus(e.target.value);
          }}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All statuses</option>
          {BOOKING_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={checkInFrom}
          onChange={(e) => {
            setOffset(0);
            setCheckInFrom(e.target.value);
          }}
          aria-label="Check-in from"
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        />
        <input
          type="date"
          value={checkInTo}
          onChange={(e) => {
            setOffset(0);
            setCheckInTo(e.target.value);
          }}
          aria-label="Check-in to"
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-6">
          <select
            value={sort}
            onChange={(e) => {
              setOffset(0);
              setSort(e.target.value);
            }}
            className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
          >
            {BOOKING_SORT_FIELDS.map((field) => (
              <option key={field} value={field}>
                Sort: {SORT_LABELS[field] || field}
              </option>
            ))}
          </select>
          <select
            value={order}
            onChange={(e) => {
              setOffset(0);
              setOrder(e.target.value);
            }}
            className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 border border-cream/30 px-6 py-3 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:border-gold hover:text-gold disabled:opacity-50 sm:flex-none"
          >
            {loading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
            )}
            Search
          </button>
        </div>
      </form>

      <div className="mt-8 overflow-x-auto border border-ink-line">
        <table className="w-full min-w-[960px] border-collapse text-left">
          <thead>
            <tr className="bg-ink-soft">
              {[
                ["booking_number", "Reference"],
                ["guest_name", "Guest"],
                [null, "Hotel"],
                ["check_in_date", "Stay"],
                ["booking_status", "Status"],
                ["total_amount", "Total"],
                [null, "Actions"],
              ].map(([field, label]) => (
                <th
                  key={label}
                  className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold"
                >
                  {field ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(field)}
                      className="inline-flex items-center gap-1.5 hover:text-cream"
                    >
                      {label}
                      {sort === field &&
                        (order === "asc" ? (
                          <ArrowUp className="h-3 w-3" strokeWidth={2} />
                        ) : (
                          <ArrowDown className="h-3 w-3" strokeWidth={2} />
                        ))}
                    </button>
                  ) : (
                    label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-cream-muted"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2
                      className="h-4 w-4 animate-spin text-gold"
                      strokeWidth={2}
                    />
                    Loading bookings…
                  </span>
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-sm text-cream-muted"
                >
                  No bookings found.
                </td>
              </tr>
            ) : (
              bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="border-t border-ink-line transition-colors hover:bg-ink-soft/60"
                >
                  <td className="px-4 py-4">
                    <div className="font-mono text-sm text-cream">
                      {booking.booking_number}
                    </div>
                    <div className="mt-1 text-[10px] tracking-[0.15em] uppercase text-cream-muted">
                      {(booking.booking_source || "").replace(/_/g, " ")}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-cream">{booking.guest_name}</div>
                    <div className="mt-1 text-xs text-cream-muted">
                      {booking.guest_email}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {booking.hotel_name}
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {formatDate(booking.check_in_date)} →{" "}
                    {formatDate(booking.check_out_date)}
                    <div className="mt-1 text-xs text-cream-muted">
                      {booking.room_type_name}
                      {booking.room_number
                        ? ` · Room ${booking.room_number}`
                        : ""}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <StatusBadge status={booking.booking_status} />
                      <StatusBadge status={booking.payment_status} />
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-cream">
                    {Number(booking.total_amount) > 0
                      ? formatPrice(
                          booking.total_amount,
                          booking.currency || "INR"
                        )
                      : "On request"}
                  </td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/bookings/${booking.id}`}
                      className="text-[11px] tracking-[0.2em] uppercase text-gold hover:text-cream"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-3 border border-ink-line bg-ink-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs tracking-[0.15em] uppercase text-cream-muted">
          {total === 0
            ? "0 results"
            : `Showing ${pageStart}–${pageEnd} of ${total}`}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canPrev || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            className="border border-cream/30 px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-cream transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!canNext || loading}
            onClick={() => setOffset(offset + PAGE_SIZE)}
            className="border border-cream/30 px-4 py-2 text-[11px] tracking-[0.2em] uppercase text-cream transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
