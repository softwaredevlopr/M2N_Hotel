"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  listAdminRooms,
  deleteAdminRoom,
  updateAdminRoom,
  ROOM_STATUSES,
  formatApiError,
} from "@/lib/adminRooms";
import { listAdminHotels } from "@/lib/adminHotels";
import { listAdminRoomTypes } from "@/lib/adminRoomTypes";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

export default function AdminRoomsPage() {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [hotelId, setHotelId] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadLookups() {
      const [hotelsResult, typesResult] = await Promise.all([
        listAdminHotels(),
        listAdminRoomTypes(),
      ]);
      if (cancelled) return;

      if (hotelsResult.unauthorized || typesResult.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (hotelsResult.ok) setHotels(hotelsResult.data?.data || []);
      if (typesResult.ok) setRoomTypes(typesResult.data?.data || []);
    }
    loadLookups();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const filteredRoomTypes = useMemo(() => {
    if (!hotelId) return roomTypes;
    return roomTypes.filter((rt) => rt.hotel_id === hotelId);
  }, [hotelId, roomTypes]);

  useEffect(() => {
    if (
      roomTypeId &&
      hotelId &&
      !filteredRoomTypes.some((rt) => rt.id === roomTypeId)
    ) {
      setRoomTypeId("");
    }
  }, [hotelId, roomTypeId, filteredRoomTypes]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAdminRooms({
      q: appliedQ.trim() || undefined,
      hotel_id: hotelId || undefined,
      room_type_id: roomTypeId || undefined,
      status: status || undefined,
    });

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to load rooms."));
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(result.data?.data || []);
    setLoading(false);
  }, [appliedQ, hotelId, roomTypeId, status, router, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const result = await deleteAdminRoom(deleteTarget.id);
    setDeleting(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Delete failed."));
      return;
    }

    setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    toast.success(`Room “${deleteTarget.room_number}” was deleted.`);
    setDeleteTarget(null);
  }

  /**
   * Activate → available; Deactivate → out_of_service
   * (rooms table has no active/inactive — inventory statuses only).
   */
  async function toggleActive(row) {
    if (togglingId) return;
    const nextStatus =
      row.status === "available" ? "out_of_service" : "available";
    setTogglingId(row.id);
    const result = await updateAdminRoom(row.id, { status: nextStatus });
    setTogglingId(null);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to update status."));
      return;
    }
    setRows((prev) =>
      prev.map((r) => (r.id === row.id ? { ...r, status: nextStatus } : r))
    );
    toast.success(
      nextStatus === "available" ? "Room activated." : "Room deactivated."
    );
  }

  function handleSearch(event) {
    event.preventDefault();
    setAppliedQ(q);
  }

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Rooms
          </span>
          <div className="gold-divider mt-5" />
          <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
            Rooms Management
          </h1>
          <p className="mt-3 text-sm text-cream-dim">
            Physical inventory — search, filter, and manage rooms.
          </p>
        </div>
        <Link
          href="/admin/rooms/new"
          className="inline-flex items-center justify-center bg-gold px-7 py-3.5 text-xs tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft"
        >
          Add Room
        </Link>
      </div>

      <form
        onSubmit={handleSearch}
        className="mt-10 flex flex-col gap-3 border border-ink-line bg-ink-soft p-4 xl:flex-row xl:items-center"
      >
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search room number…"
          className="w-full flex-1 bg-ink border border-ink-line px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:border-gold focus:outline-none"
        />
        <select
          value={hotelId}
          onChange={(e) => setHotelId(e.target.value)}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All hotels</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>
        <select
          value={roomTypeId}
          onChange={(e) => setRoomTypeId(e.target.value)}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All room types</option>
          {filteredRoomTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>
              {rt.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All statuses</option>
          {ROOM_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 border border-cream/30 px-6 py-3 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
        >
          {loading && (
            <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
          )}
          Search
        </button>
      </form>

      <div className="mt-8 overflow-x-auto border border-ink-line">
        <table className="w-full min-w-[960px] border-collapse text-left">
          <thead>
            <tr className="bg-ink-soft">
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Room Number
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Hotel
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Room Type
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Floor Label
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Status
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-cream-muted"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2
                      className="h-4 w-4 animate-spin text-gold"
                      strokeWidth={2}
                    />
                    Loading rooms…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-cream-muted"
                >
                  No rooms found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-ink-line transition-colors hover:bg-ink-soft/60"
                >
                  <td className="px-4 py-4 font-display text-lg text-cream">
                    {row.room_number}
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {row.hotel_name || "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {row.room_type_name || "—"}
                  </td>
                  <td className="px-4 py-4 text-sm text-cream-dim">
                    {row.floor_label || "—"}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/admin/rooms/${row.id}/edit`}
                        className="border border-ink-line px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream-dim transition-colors hover:border-gold hover:text-gold"
                      >
                        Edit
                      </Link>
                      <button
                        type="button"
                        disabled={togglingId === row.id}
                        onClick={() => toggleActive(row)}
                        className="border border-ink-line px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-cream-dim transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
                      >
                        {row.status === "available"
                          ? "Deactivate"
                          : "Activate"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(row)}
                        className="border border-gold/40 px-3 py-1.5 text-[10px] tracking-[0.18em] uppercase text-gold transition-colors hover:bg-gold/10"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete room?"
        message={
          deleteTarget
            ? `Delete room “${deleteTarget.room_number}”? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete Room"
        cancelLabel="Cancel"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => (!deleting ? setDeleteTarget(null) : null)}
      />
    </div>
  );
}
