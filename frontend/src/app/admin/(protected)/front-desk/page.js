"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  canAssignBookingRoom,
  canFrontDeskCheckIn,
  canFrontDeskCheckOut,
  canFrontDeskNoShow,
  FRONT_DESK_ARRIVAL_STATUSES,
  FRONT_DESK_DEPARTURE_STATUSES,
  FRONT_DESK_IN_HOUSE_STATUSES,
  assignAdminBookingRoom,
  formatApiError,
  getAdminBookingStats,
  listAdminBookings,
  mergeFrontDeskOccupancyBookings,
  updateAdminBookingStatus,
} from "@/lib/adminBookings";
import { listAdminHotels } from "@/lib/adminHotels";
import { listAdminRooms } from "@/lib/adminRooms";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import FrontDeskRoomBoard from "@/components/admin/FrontDeskRoomBoard";
import { useToast } from "@/components/admin/Toast";

const LIST_LIMIT = 100;

function buildFrontDeskHref(hotelId, view) {
  const params = new URLSearchParams();
  if (hotelId) params.set("hotel_id", hotelId);
  if (view === "rooms") params.set("view", "rooms");
  const qs = params.toString();
  return qs ? `/admin/front-desk?${qs}` : "/admin/front-desk";
}

const ACTION_BUTTON_CLASS =
  "inline-flex items-center justify-center border border-gold/50 px-3 py-2 text-[10px] tracking-[0.16em] uppercase text-gold transition-colors hover:border-gold hover:bg-gold/10 disabled:cursor-not-allowed disabled:opacity-50";

function formatDate(iso) {
  if (!iso) return "—";
  return String(iso).slice(0, 10);
}

function StatCard({ label, value, hint }) {
  return (
    <div className="border border-ink-line bg-ink-soft p-5">
      <div className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
        {label}
      </div>
      <div className="mt-3 font-display text-3xl text-gold">{value}</div>
      {hint ? (
        <p className="mt-2 text-xs leading-relaxed text-cream-dim">{hint}</p>
      ) : null}
    </div>
  );
}

function BookingOpsTable({
  rows,
  emptyLabel,
  truncated,
  hotelId,
  showCheckIn,
  showCheckOut,
  showNoShow,
  busyId,
  onCheckIn,
  onCheckOut,
  onNoShow,
}) {
  return (
    <div className="border border-ink-line bg-ink-soft">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b border-ink-line text-[10px] tracking-[0.2em] uppercase text-cream-muted">
              <th className="px-4 py-3 font-normal">Guest</th>
              <th className="px-4 py-3 font-normal">Reference</th>
              <th className="px-4 py-3 font-normal">Stay</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-sm text-cream-muted"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((booking) => {
                const isolated = booking.hotel_id === hotelId;
                const rowBusy = busyId === booking.id;
                const checkIn = showCheckIn && canFrontDeskCheckIn(booking);
                const checkOut = showCheckOut && canFrontDeskCheckOut(booking);
                const noShow = showNoShow && canFrontDeskNoShow(booking);

                return (
                  <tr
                    key={booking.id}
                    className="border-t border-ink-line transition-colors hover:bg-ink/60"
                  >
                    <td className="px-4 py-4">
                      <div className="text-sm text-cream">{booking.guest_name}</div>
                      <div className="mt-1 text-xs text-cream-muted">
                        {booking.adults || 0} adult
                        {Number(booking.adults) === 1 ? "" : "s"}
                        {Number(booking.children) > 0
                          ? ` · ${booking.children} child${
                              Number(booking.children) === 1 ? "" : "ren"
                            }`
                          : ""}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-sm text-cream">
                      {booking.booking_number}
                    </td>
                    <td className="px-4 py-4 text-sm text-cream-dim">
                      {formatDate(booking.check_in_date)} →{" "}
                      {formatDate(booking.check_out_date)}
                      <div className="mt-1 text-xs text-cream-muted">
                        {booking.room_type_name}
                        {booking.room_number
                          ? ` · Room ${booking.room_number}`
                          : " · Unassigned"}
                        {Number(booking.number_of_rooms) > 1
                          ? ` · ${booking.number_of_rooms} rooms`
                          : ""}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={booking.booking_status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col items-start gap-2">
                        {checkIn ? (
                          <button
                            type="button"
                            disabled={!isolated || Boolean(busyId)}
                            onClick={() => onCheckIn(booking)}
                            className={ACTION_BUTTON_CLASS}
                          >
                            {rowBusy ? (
                              <Loader2
                                className="mr-2 h-3 w-3 animate-spin"
                                strokeWidth={2}
                              />
                            ) : null}
                            Check in
                          </button>
                        ) : null}
                        {checkOut ? (
                          <button
                            type="button"
                            disabled={!isolated || Boolean(busyId)}
                            onClick={() => onCheckOut(booking)}
                            className={ACTION_BUTTON_CLASS}
                          >
                            {rowBusy ? (
                              <Loader2
                                className="mr-2 h-3 w-3 animate-spin"
                                strokeWidth={2}
                              />
                            ) : null}
                            Check out
                          </button>
                        ) : null}
                        {noShow ? (
                          <button
                            type="button"
                            disabled={!isolated || Boolean(busyId)}
                            onClick={() => onNoShow(booking)}
                            className={ACTION_BUTTON_CLASS}
                          >
                            {rowBusy ? (
                              <Loader2
                                className="mr-2 h-3 w-3 animate-spin"
                                strokeWidth={2}
                              />
                            ) : null}
                            Mark no-show
                          </button>
                        ) : null}
                        <Link
                          href={`/admin/bookings/${booking.id}`}
                          className="text-[11px] tracking-[0.2em] uppercase text-gold hover:text-cream"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {truncated ? (
        <p className="border-t border-ink-line px-4 py-3 text-xs text-cream-muted">
          Showing the first {LIST_LIMIT} matching bookings.{" "}
          <Link href="/admin/bookings" className="text-gold hover:text-cream">
            Open bookings
          </Link>
        </p>
      ) : null}
    </div>
  );
}

export default function AdminFrontDeskPage() {
  return (
    <Suspense
      fallback={
        <p className="inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading…
        </p>
      }
    >
      <AdminFrontDeskPageInner />
    </Suspense>
  );
}

function AdminFrontDeskPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialHotel = searchParams.get("hotel_id") || "";
  const boardView = searchParams.get("view") === "rooms" ? "rooms" : "ops";

  const [hotels, setHotels] = useState([]);
  const [hotelId, setHotelId] = useState(initialHotel);
  const [loadingHotels, setLoadingHotels] = useState(true);

  const [stats, setStats] = useState(null);
  const [arrivals, setArrivals] = useState([]);
  const [departures, setDepartures] = useState([]);
  const [inHouse, setInHouse] = useState([]);
  const [truncated, setTruncated] = useState({
    arrivals: false,
    departures: false,
    inHouse: false,
  });
  const [loadingOps, setLoadingOps] = useState(false);

  const [pendingAction, setPendingAction] = useState(null);
  const [noShowReason, setNoShowReason] = useState("");
  const [assignRoomId, setAssignRoomId] = useState("");
  const [assignRooms, setAssignRooms] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [busyId, setBusyId] = useState("");

  const selectedHotel = useMemo(
    () => hotels.find((hotel) => hotel.id === hotelId) || null,
    [hotels, hotelId]
  );

  const occupancyBookings = useMemo(
    () =>
      mergeFrontDeskOccupancyBookings(
        [arrivals, departures, inHouse],
        hotelId
      ),
    [arrivals, departures, inHouse, hotelId]
  );

  const occupancyTruncated =
    truncated.arrivals || truncated.departures || truncated.inHouse;

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

  const loadOps = useCallback(
    async ({ silent = false } = {}) => {
      if (!hotelId) {
        setStats(null);
        setArrivals([]);
        setDepartures([]);
        setInHouse([]);
        setTruncated({ arrivals: false, departures: false, inHouse: false });
        setLoadingOps(false);
        return;
      }

      if (!silent) setLoadingOps(true);
      const statsResult = await getAdminBookingStats({ hotel_id: hotelId });
      if (statsResult.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (!statsResult.ok) {
        toast.error(
          formatApiError(statsResult, "Unable to load front-desk stats.")
        );
        setStats(null);
        setArrivals([]);
        setDepartures([]);
        setInHouse([]);
        setLoadingOps(false);
        return;
      }

      const scoped = statsResult.data?.data || null;
      const today = scoped?.today;
      setStats(scoped);

      if (!today) {
        setArrivals([]);
        setDepartures([]);
        setInHouse([]);
        setLoadingOps(false);
        return;
      }

      const [arrivalResult, departureResult, inHouseResult] = await Promise.all(
        [
          listAdminBookings({
            hotel_id: hotelId,
            check_in_from: today,
            check_in_to: today,
            sort: "guest_name",
            order: "asc",
            limit: LIST_LIMIT,
            offset: 0,
          }),
          listAdminBookings({
            hotel_id: hotelId,
            check_out_from: today,
            check_out_to: today,
            sort: "guest_name",
            order: "asc",
            limit: LIST_LIMIT,
            offset: 0,
          }),
          listAdminBookings({
            hotel_id: hotelId,
            stay_on: today,
            sort: "guest_name",
            order: "asc",
            limit: LIST_LIMIT,
            offset: 0,
          }),
        ]
      );

      const unauthorized = [arrivalResult, departureResult, inHouseResult].some(
        (result) => result.unauthorized
      );
      if (unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (!arrivalResult.ok || !departureResult.ok || !inHouseResult.ok) {
        toast.error("Unable to load today's front-desk lists.");
        setArrivals([]);
        setDepartures([]);
        setInHouse([]);
        setLoadingOps(false);
        return;
      }

      const arrivalRows = (arrivalResult.data?.data || []).filter((row) =>
        FRONT_DESK_ARRIVAL_STATUSES.includes(row.booking_status)
      );
      const departureRows = (departureResult.data?.data || []).filter((row) =>
        FRONT_DESK_DEPARTURE_STATUSES.includes(row.booking_status)
      );
      const inHouseRows = (inHouseResult.data?.data || []).filter((row) =>
        FRONT_DESK_IN_HOUSE_STATUSES.includes(row.booking_status)
      );

      setArrivals(arrivalRows);
      setDepartures(departureRows);
      setInHouse(inHouseRows);
      setTruncated({
        arrivals: Number(arrivalResult.data?.total) > LIST_LIMIT,
        departures: Number(departureResult.data?.total) > LIST_LIMIT,
        inHouse: Number(inHouseResult.data?.total) > LIST_LIMIT,
      });
      setLoadingOps(false);
    },
    [hotelId, router, toast]
  );

  useEffect(() => {
    loadOps();
  }, [loadOps]);

  function handleHotelChange(nextId) {
    setPendingAction(null);
    setHotelId(nextId);
    router.replace(buildFrontDeskHref(nextId, boardView), { scroll: false });
  }

  function handleViewChange(nextView) {
    setPendingAction(null);
    router.replace(buildFrontDeskHref(hotelId, nextView), { scroll: false });
  }

  function assertHotel(booking) {
    if (!booking || booking.hotel_id !== hotelId) {
      toast.error("This booking belongs to another hotel.");
      return false;
    }
    return true;
  }

  async function openCheckIn(booking) {
    if (!assertHotel(booking) || !canFrontDeskCheckIn(booking)) return;
    setNoShowReason("");
    setAssignRoomId(booking.room_id || "");
    setAssignRooms([]);
    setPendingAction({ type: "check_in", booking });

    if (!canAssignBookingRoom(booking)) return;

    setLoadingRooms(true);
    const result = await listAdminRooms({
      hotel_id: booking.hotel_id,
      room_type_id: booking.room_type_id,
    });
    setLoadingRooms(false);
    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to load rooms for assignment."));
      return;
    }
    setAssignRooms(result.data?.data || []);
  }

  function openCheckOut(booking) {
    if (!assertHotel(booking) || !canFrontDeskCheckOut(booking)) return;
    setNoShowReason("");
    setPendingAction({ type: "check_out", booking });
  }

  function openNoShow(booking) {
    if (!assertHotel(booking) || !canFrontDeskNoShow(booking)) return;
    setNoShowReason("");
    setPendingAction({ type: "no_show", booking });
  }

  function closePending() {
    if (busyId) return;
    setPendingAction(null);
    setNoShowReason("");
    setAssignRooms([]);
    setAssignRoomId("");
  }

  async function confirmPendingAction() {
    const action = pendingAction;
    const booking = action?.booking;
    if (!booking || !assertHotel(booking)) return;

    if (action.type === "check_in" && !canFrontDeskCheckIn(booking)) {
      toast.error("This booking cannot be checked in from its current status.");
      return;
    }
    if (action.type === "check_out" && !canFrontDeskCheckOut(booking)) {
      toast.error("This booking cannot be checked out from its current status.");
      return;
    }
    if (action.type === "no_show") {
      if (!canFrontDeskNoShow(booking)) {
        toast.error("This booking cannot be marked no-show.");
        return;
      }
      if (!noShowReason.trim()) {
        toast.error("Please add a no-show reason.");
        return;
      }
    }

    setBusyId(booking.id);

    if (action.type === "check_in" && canAssignBookingRoom(booking)) {
      const nextRoomId = assignRoomId || null;
      if (nextRoomId && nextRoomId !== booking.room_id) {
        const assigned = await assignAdminBookingRoom(booking.id, nextRoomId);
        if (assigned.unauthorized) {
          clearAdminSession();
          router.replace("/admin/login");
          setBusyId("");
          return;
        }
        if (!assigned.ok) {
          toast.error(
            formatApiError(
              assigned,
              "Room assignment failed. Check-in was not applied."
            )
          );
          setBusyId("");
          return;
        }
      }
    }

    const nextStatus =
      action.type === "check_in"
        ? "checked_in"
        : action.type === "check_out"
          ? "checked_out"
          : "no_show";
    const payload = { booking_status: nextStatus };
    if (action.type === "no_show") {
      payload.cancellation_reason = noShowReason.trim();
    }

    const result = await updateAdminBookingStatus(booking.id, payload);
    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      setBusyId("");
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Status update failed."));
      setBusyId("");
      return;
    }

    const labels = {
      check_in: "Guest checked in.",
      check_out: "Guest checked out.",
      no_show: "Booking marked no-show.",
    };
    toast.success(labels[action.type]);
    setPendingAction(null);
    setNoShowReason("");
    setAssignRooms([]);
    setAssignRoomId("");
    await loadOps({ silent: true });
    setBusyId("");
  }

  const occupancy = stats?.occupancy;
  const pendingBooking = pendingAction?.booking;
  const dialogBusy = Boolean(busyId);

  return (
    <div>
      <span className="text-xs tracking-[0.45em] uppercase text-gold">
        Front Desk
      </span>
      <div className="gold-divider mt-5" />
      <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
        Front Desk
      </h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-cream-dim">
        Hotel-scoped arrivals, departures, in-house guests, and a physical room
        status board from the existing booking and rooms APIs. Check-in,
        check-out, and no-show use the same status rules as booking detail.
        Room operational status is separate from booking occupancy.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-3 border border-ink-line bg-ink-soft p-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
            Hotel
          </span>
          <select
            value={hotelId}
            onChange={(e) => handleHotelChange(e.target.value)}
            disabled={loadingHotels || Boolean(busyId)}
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
      </div>

      {!hotelId ? (
        <p className="mt-10 text-sm text-cream-muted">
          {loadingHotels
            ? "Loading hotels…"
            : hotels.length === 0
              ? "No hotels are available yet."
              : "Select a hotel to view today’s operations and room status."}
        </p>
      ) : loadingOps ? (
        <p className="mt-10 inline-flex items-center gap-2 text-sm text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading {selectedHotel?.name || "hotel"} front desk…
        </p>
      ) : (
        <>
          <div className="mt-10">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-[11px] tracking-[0.25em] uppercase text-gold">
                {selectedHotel?.name || "Hotel"} · {stats?.today || "today"}
              </h2>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href={`/admin/bookings?hotel_id=${encodeURIComponent(hotelId)}`}
                  className="text-[11px] tracking-[0.2em] uppercase text-cream-muted hover:text-gold"
                >
                  All bookings →
                </Link>
                <Link
                  href={`/admin/rooms?hotel_id=${encodeURIComponent(hotelId)}`}
                  className="text-[11px] tracking-[0.2em] uppercase text-cream-muted hover:text-gold"
                >
                  All rooms →
                </Link>
              </div>
            </div>

            {stats ? (
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  label="Today's arrivals"
                  value={stats.arrivals_today}
                  hint={`Check-in ${stats.today}`}
                />
                <StatCard
                  label="Today's departures"
                  value={stats.departures_today}
                  hint={`Check-out ${stats.today}`}
                />
                <StatCard
                  label="In-house"
                  value={occupancy?.in_house_bookings ?? 0}
                  hint="Pending, confirmed, or checked in tonight"
                />
                <StatCard
                  label="Occupancy tonight"
                  value={`${occupancy?.occupancy_pct ?? 0}%`}
                  hint={`${occupancy?.rooms_held_tonight ?? 0} of ${
                    occupancy?.sellable_rooms ?? 0
                  } sellable rooms held`}
                />
              </div>
            ) : (
              <p className="mt-5 text-sm text-cream-muted">
                Stats are unavailable for this hotel right now.
              </p>
            )}
          </div>

          <div className="mt-10 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleViewChange("ops")}
              className={`px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase transition-colors ${
                boardView === "ops"
                  ? "border border-gold bg-gold/10 text-gold"
                  : "border border-ink-line text-cream-muted hover:border-gold hover:text-gold"
              }`}
            >
              Operations
            </button>
            <button
              type="button"
              onClick={() => handleViewChange("rooms")}
              className={`px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase transition-colors ${
                boardView === "rooms"
                  ? "border border-gold bg-gold/10 text-gold"
                  : "border border-ink-line text-cream-muted hover:border-gold hover:text-gold"
              }`}
            >
              Room status
            </button>
          </div>

          {boardView === "rooms" ? (
            <div className="mt-12">
              <FrontDeskRoomBoard
                hotelId={hotelId}
                today={stats?.today || ""}
                occupancyBookings={occupancyBookings}
                truncated={occupancyTruncated}
                disabled={Boolean(busyId)}
                onUnauthorized={() => {
                  clearAdminSession();
                  router.replace("/admin/login");
                }}
              />
            </div>
          ) : (
            <>
          <section className="mt-12">
            <h2 className="text-[11px] tracking-[0.25em] uppercase text-gold">
              Today&apos;s arrivals
            </h2>
            <p className="mt-2 text-xs text-cream-muted">
              {arrivals.length} shown · Check in (confirmed) · Mark no-show
              (pending or confirmed)
            </p>
            <div className="mt-4">
              <BookingOpsTable
                rows={arrivals}
                emptyLabel="No arrivals for this hotel today."
                truncated={truncated.arrivals}
                hotelId={hotelId}
                showCheckIn
                showNoShow
                busyId={busyId}
                onCheckIn={openCheckIn}
                onCheckOut={openCheckOut}
                onNoShow={openNoShow}
              />
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-[11px] tracking-[0.25em] uppercase text-gold">
              Today&apos;s departures
            </h2>
            <p className="mt-2 text-xs text-cream-muted">
              {departures.length} shown · Check out (checked in) · Mark no-show
              if they never arrived
            </p>
            <div className="mt-4">
              <BookingOpsTable
                rows={departures}
                emptyLabel="No departures for this hotel today."
                truncated={truncated.departures}
                hotelId={hotelId}
                showCheckOut
                showNoShow
                busyId={busyId}
                onCheckIn={openCheckIn}
                onCheckOut={openCheckOut}
                onNoShow={openNoShow}
              />
            </div>
          </section>

          <section className="mt-12">
            <h2 className="text-[11px] tracking-[0.25em] uppercase text-gold">
              Current in-house
            </h2>
            <p className="mt-2 text-xs text-cream-muted">
              {inHouse.length} shown · Check in (confirmed) · Check out (checked
              in)
            </p>
            <div className="mt-4">
              <BookingOpsTable
                rows={inHouse}
                emptyLabel="No in-house guests for this hotel tonight."
                truncated={truncated.inHouse}
                hotelId={hotelId}
                showCheckIn
                showCheckOut
                showNoShow
                busyId={busyId}
                onCheckIn={openCheckIn}
                onCheckOut={openCheckOut}
                onNoShow={openNoShow}
              />
            </div>
          </section>
            </>
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingAction?.type === "check_in"}
        title="Check in guest"
        message={
          pendingBooking
            ? `Check in ${pendingBooking.guest_name} (${pendingBooking.booking_number})? Status will change to checked in. Pending bookings must be confirmed first.`
            : ""
        }
        confirmLabel="Check in"
        busy={dialogBusy}
        onCancel={closePending}
        onConfirm={confirmPendingAction}
      >
        {pendingBooking && Number(pendingBooking.number_of_rooms) > 1 ? (
          <p className="mt-4 text-sm text-cream-dim">
            This reservation is for {pendingBooking.number_of_rooms} rooms.
            Physical assignment supports a single room only — check in without
            assigning, or open the booking detail.
          </p>
        ) : null}
        {pendingBooking && canAssignBookingRoom(pendingBooking) ? (
          <div className="mt-4">
            <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
              Assigned room{" "}
              <span className="normal-case tracking-normal text-cream-dim">
                (optional)
              </span>
            </label>
            {loadingRooms ? (
              <p className="mt-2 inline-flex items-center gap-2 text-sm text-cream-muted">
                <Loader2
                  className="h-4 w-4 animate-spin text-gold"
                  strokeWidth={2}
                />
                Loading rooms…
              </p>
            ) : (
              <select
                value={assignRoomId}
                onChange={(e) => setAssignRoomId(e.target.value)}
                disabled={dialogBusy}
                className="mt-2 w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none disabled:opacity-50"
              >
                <option value="">Leave unassigned</option>
                {assignRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.room_number}
                    {room.status ? ` (${room.status})` : ""}
                  </option>
                ))}
              </select>
            )}
            <p className="mt-2 text-xs text-cream-muted">
              Check-in does not require a room. Assignment uses the existing
              single-room API and is refused with 409 when the room is not
              assignable.
            </p>
          </div>
        ) : null}
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingAction?.type === "check_out"}
        title="Check out guest"
        message={
          pendingBooking
            ? `Check out ${pendingBooking.guest_name} (${pendingBooking.booking_number})? Status will change to checked out.`
            : ""
        }
        confirmLabel="Check out"
        busy={dialogBusy}
        onCancel={closePending}
        onConfirm={confirmPendingAction}
      />

      <ConfirmDialog
        open={pendingAction?.type === "no_show"}
        title="Mark no-show"
        message={
          pendingBooking
            ? `Mark ${pendingBooking.guest_name} (${pendingBooking.booking_number}) as no-show? This releases inventory and cannot be undone from this screen.`
            : ""
        }
        confirmLabel="Mark no-show"
        busy={dialogBusy}
        onCancel={closePending}
        onConfirm={confirmPendingAction}
      >
        <div className="mt-4">
          <label className="block text-[10px] tracking-[0.22em] uppercase text-cream-muted">
            No-show reason <span className="text-gold">*</span>
          </label>
          <textarea
            rows={3}
            value={noShowReason}
            onChange={(e) => setNoShowReason(e.target.value)}
            maxLength={2000}
            disabled={dialogBusy}
            className="mt-2 w-full resize-y bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none disabled:opacity-50"
            placeholder="Why is this booking being marked no-show?"
          />
          <p className="mt-2 text-xs text-cream-muted">
            Stored as cancellation_reason — same field as booking detail.
          </p>
        </div>
      </ConfirmDialog>
    </div>
  );
}
