"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  occupancyContextForRoom,
  formatApiError,
} from "@/lib/adminBookings";
import {
  listAdminRooms,
  updateAdminRoom,
  ROOM_STATUSES,
} from "@/lib/adminRooms";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

function occupancyLabel(context) {
  if (!context) return "No assigned booking today";
  const parts = [];
  if (context.arriving) parts.push("arriving today");
  if (context.departing) parts.push("departing today");
  if (context.inHouse && !context.arriving && !context.departing) {
    parts.push("in-house");
  }
  return parts.length > 0 ? parts.join(" · ") : "Assigned stay";
}

function mismatchNote(room, context) {
  if (context && room.status === "available") {
    return "Assigned booking · operational status still available";
  }
  if (!context && room.status === "occupied") {
    return "Marked occupied · no assigned booking today";
  }
  return null;
}

export default function FrontDeskRoomBoard({
  hotelId,
  today,
  occupancyBookings = [],
  truncated = false,
  disabled = false,
  onUnauthorized,
}) {
  const toast = useToast();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [pending, setPending] = useState(null);
  const onUnauthorizedRef = useRef(onUnauthorized);
  onUnauthorizedRef.current = onUnauthorized;

  const loadRooms = useCallback(async () => {
    if (!hotelId) {
      setRooms([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await listAdminRooms({ hotel_id: hotelId });
    if (result.unauthorized) {
      clearAdminSession();
      onUnauthorizedRef.current?.();
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to load rooms."));
      setRooms([]);
      setLoading(false);
      return;
    }
    const rows = (result.data?.data || []).filter(
      (room) => room.hotel_id === hotelId
    );
    setRooms(rows);
    setLoading(false);
  }, [hotelId, toast]);

  useEffect(() => {
    setPending(null);
    setBusyId("");
  }, [hotelId]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const unassignedHolds = useMemo(
    () =>
      occupancyBookings.filter(
        (booking) =>
          booking.hotel_id === hotelId &&
          !booking.room_id &&
          ["pending", "confirmed", "checked_in"].includes(
            booking.booking_status
          )
      ).length,
    [occupancyBookings, hotelId]
  );

  function requestStatusChange(room, nextStatus) {
    if (disabled || busyId) return;
    if (room.hotel_id !== hotelId) {
      toast.error("This room belongs to another hotel.");
      return;
    }
    if (!ROOM_STATUSES.includes(nextStatus)) {
      toast.error("That room status is not allowed.");
      return;
    }
    if (nextStatus === room.status) return;
    setPending({ room, nextStatus });
  }

  async function confirmStatusChange() {
    const room = pending?.room;
    const nextStatus = pending?.nextStatus;
    if (!room || !nextStatus) return;
    if (room.hotel_id !== hotelId) {
      toast.error("This room belongs to another hotel.");
      return;
    }

    setBusyId(room.id);
    const result = await updateAdminRoom(room.id, { status: nextStatus });
    if (result.unauthorized) {
      clearAdminSession();
      onUnauthorizedRef.current?.();
      setBusyId("");
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to update room status."));
      setBusyId("");
      return;
    }

    const updated = result.data?.data;
    setRooms((prev) =>
      prev.map((row) =>
        row.id === room.id
          ? { ...row, ...(updated && updated.hotel_id === hotelId ? updated : { status: nextStatus }) }
          : row
      )
    );
    toast.success(`Room ${room.room_number} marked ${nextStatus.replace(/_/g, " ")}.`);
    setPending(null);
    setBusyId("");
  }

  if (!hotelId) return null;

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.25em] uppercase text-gold">
        Room status
      </h2>
      <p className="mt-2 max-w-2xl text-xs leading-relaxed text-cream-muted">
        Physical <span className="text-cream">rooms.status</span> is operational
        inventory (available, occupied, maintenance, blocked, out of service).
        Guest occupancy comes from assigned bookings and is not updated
        automatically when a booking is checked in or out.
      </p>
      {unassignedHolds > 0 ? (
        <p className="mt-3 text-xs text-cream-dim">
          {unassignedHolds} in-house/arrival booking
          {unassignedHolds === 1 ? "" : "s"} today{" "}
          {unassignedHolds === 1 ? "has" : "have"} no physical room assigned.
        </p>
      ) : null}
      {truncated ? (
        <p className="mt-3 text-xs text-cream-muted">
          Today&apos;s booking lists were truncated at 100 rows, so occupancy
          chips may miss some assigned stays. Open bookings for the full list.
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 inline-flex items-center gap-2 text-sm text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading rooms…
        </p>
      ) : rooms.length === 0 ? (
        <p className="mt-6 text-sm text-cream-muted">
          No physical rooms for this hotel.
        </p>
      ) : (
        <div className="mt-6 border border-ink-line bg-ink-soft">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-ink-line text-[10px] tracking-[0.2em] uppercase text-cream-muted">
                  <th className="px-4 py-3 font-normal">Room</th>
                  <th className="px-4 py-3 font-normal">Type / floor</th>
                  <th className="px-4 py-3 font-normal">Operational status</th>
                  <th className="px-4 py-3 font-normal">Booking occupancy</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => {
                  const context = occupancyContextForRoom(
                    room,
                    occupancyBookings,
                    today
                  );
                  const booking = context?.booking;
                  const mismatch = mismatchNote(room, context);
                  const rowBusy = busyId === room.id;

                  return (
                    <tr
                      key={room.id}
                      className="border-t border-ink-line align-top"
                    >
                      <td className="px-4 py-4">
                        <div className="font-mono text-sm text-cream">
                          {room.room_number}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-cream-dim">
                        {room.room_type_name || "—"}
                        <div className="mt-1 text-xs text-cream-muted">
                          {room.floor_label || "No floor label"}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={room.status} />
                        <label className="mt-3 block">
                          <span className="sr-only">
                            Operational status for room {room.room_number}
                          </span>
                          <select
                            value={
                              pending?.room.id === room.id
                                ? pending.nextStatus
                                : room.status
                            }
                            disabled={
                              disabled || Boolean(busyId) || Boolean(pending)
                            }
                            onChange={(event) =>
                              requestStatusChange(room, event.target.value)
                            }
                            className="mt-2 w-full max-w-[12rem] bg-ink border border-ink-line px-3 py-2 text-xs text-cream focus:border-gold focus:outline-none disabled:opacity-50"
                          >
                            {ROOM_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status.replace(/_/g, " ")}
                              </option>
                            ))}
                          </select>
                        </label>
                        {rowBusy ? (
                          <p className="mt-2 inline-flex items-center gap-2 text-xs text-cream-muted">
                            <Loader2
                              className="h-3 w-3 animate-spin text-gold"
                              strokeWidth={2}
                            />
                            Saving…
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        {booking ? (
                          <div>
                            <div className="text-sm text-cream">
                              {booking.guest_name || "Guest"}
                            </div>
                            <div className="mt-1 font-mono text-xs text-cream-muted">
                              {booking.booking_number}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <StatusBadge status={booking.booking_status} />
                            </div>
                            <p className="mt-2 text-xs text-cream-dim">
                              {occupancyLabel(context)}
                              {today
                                ? ` · ${String(booking.check_in_date).slice(0, 10)} → ${String(booking.check_out_date).slice(0, 10)}`
                                : ""}
                            </p>
                            <Link
                              href={`/admin/bookings/${booking.id}`}
                              className="mt-2 inline-block text-[11px] tracking-[0.2em] uppercase text-gold hover:text-cream"
                            >
                              View booking
                            </Link>
                          </div>
                        ) : (
                          <p className="text-sm text-cream-muted">
                            No assigned booking today
                          </p>
                        )}
                        {mismatch ? (
                          <p className="mt-2 text-xs text-gold">{mismatch}</p>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title="Update operational status"
        message={
          pending
            ? `Set room ${pending.room.room_number} to “${pending.nextStatus.replace(/_/g, " ")}”? This changes rooms.status only. It does not check a guest in or out.`
            : ""
        }
        confirmLabel="Update room status"
        busy={Boolean(busyId)}
        onCancel={() => {
          if (!busyId) setPending(null);
        }}
        onConfirm={confirmStatusChange}
      >
        {pending &&
        occupancyContextForRoom(
          pending.room,
          occupancyBookings,
          today
        ) ? (
          <p className="mt-4 text-sm text-cream-dim">
            This room currently has an assigned booking. Operational status and
            booking occupancy stay independent.
          </p>
        ) : null}
      </ConfirmDialog>
    </section>
  );
}
