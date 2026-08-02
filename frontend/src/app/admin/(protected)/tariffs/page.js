"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { listAdminHotels } from "@/lib/adminHotels";
import { listAdminRoomTypes } from "@/lib/adminRoomTypes";
import {
  listAdminTariffs,
  deleteAdminTariff,
  updateAdminTariff,
  getAdminTariffSettings,
  updateAdminTariffSettings,
  formatApiError,
  mealPlanLabel,
  occupancyLabel,
  MEAL_PLANS,
  OCCUPANCY_TYPES,
  TARIFF_STATUSES,
  settingsToForm,
  formToSettingsPayload,
  emptyTariffSettingsForm,
} from "@/lib/adminTariffs";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function AdminTariffsPage() {
  const router = useRouter();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [hotelId, setHotelId] = useState("");
  const [roomTypeId, setRoomTypeId] = useState("");
  const [mealPlan, setMealPlan] = useState("");
  const [occupancy, setOccupancy] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [settingsForm, setSettingsForm] = useState(emptyTariffSettingsForm());
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    async function loadRoomTypes() {
      if (!hotelId) {
        setRoomTypes([]);
        return;
      }
      const result = await listAdminRoomTypes({ hotel_id: hotelId });
      if (cancelled) return;
      if (result.ok) setRoomTypes(result.data?.data || []);
    }
    loadRoomTypes();
    return () => {
      cancelled = true;
    };
  }, [hotelId]);

  useEffect(() => {
    let cancelled = false;
    async function loadSettings() {
      if (!hotelId) {
        setSettingsForm(emptyTariffSettingsForm());
        return;
      }
      setSettingsLoading(true);
      const result = await getAdminTariffSettings(hotelId);
      if (cancelled) return;
      setSettingsLoading(false);
      if (result.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      if (result.ok) {
        setSettingsForm(settingsToForm(result.data?.data?.settings));
      }
    }
    loadSettings();
    return () => {
      cancelled = true;
    };
  }, [hotelId, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await listAdminTariffs({
      hotel_id: hotelId || undefined,
      room_type_id: roomTypeId || undefined,
      meal_plan: mealPlan || undefined,
      occupancy: occupancy || undefined,
      status: status || undefined,
    });

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to load tariffs."));
      setRows([]);
      setLoading(false);
      return;
    }

    setRows(result.data?.data || []);
    setLoading(false);
  }, [hotelId, roomTypeId, mealPlan, occupancy, status, router, toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    const result = await deleteAdminTariff(deleteTarget.id);
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
    toast.success("Tariff rate deleted.");
    setDeleteTarget(null);
  }

  async function toggleActive(row) {
    if (togglingId) return;
    const nextStatus = row.status === "active" ? "inactive" : "active";
    setTogglingId(row.id);
    const result = await updateAdminTariff(row.id, { status: nextStatus });
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
    toast.success(nextStatus === "active" ? "Activated." : "Deactivated.");
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (!hotelId || settingsSaving) return;
    setSettingsSaving(true);
    const result = await updateAdminTariffSettings(
      hotelId,
      formToSettingsPayload(settingsForm)
    );
    setSettingsSaving(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to save settings."));
      return;
    }
    toast.success("Hotel tariff settings saved.");
  }

  return (
    <div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Tariffs
          </span>
          <div className="gold-divider mt-5" />
          <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
            Rate &amp; Tariff Management
          </h1>
          <p className="mt-3 text-sm text-cream-dim">
            Manage meal-plan matrix rates, occupancy pricing, and seasonal windows.
          </p>
        </div>
        <Link
          href="/admin/tariffs/new"
          className="inline-flex items-center justify-center bg-gold px-7 py-3.5 text-xs tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft"
        >
          Add Tariff Rate
        </Link>
      </div>

      <div className="mt-10 flex flex-col gap-3 border border-ink-line bg-ink-soft p-4 lg:flex-row lg:flex-wrap lg:items-center">
        <select
          value={hotelId}
          onChange={(e) => {
            setHotelId(e.target.value);
            setRoomTypeId("");
          }}
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
          disabled={!hotelId}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none disabled:opacity-50"
        >
          <option value="">All room types</option>
          {roomTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>
              {rt.name}
            </option>
          ))}
        </select>
        <select
          value={mealPlan}
          onChange={(e) => setMealPlan(e.target.value)}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All meal plans</option>
          {MEAL_PLANS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={occupancy}
          onChange={(e) => setOccupancy(e.target.value)}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All occupancy</option>
          {OCCUPANCY_TYPES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
        >
          <option value="">All statuses</option>
          {TARIFF_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {hotelId && (
        <form
          onSubmit={saveSettings}
          className="mt-8 border border-ink-line bg-ink-soft p-6"
        >
          <h2 className="font-display text-2xl text-cream">
            Hotel Tariff Settings
          </h2>
          <p className="mt-2 text-sm text-cream-dim">
            Disclaimer, extra bed, GST, and cancellation copy for the public tariff
            section.
          </p>
          {settingsLoading ? (
            <p className="mt-6 text-sm text-cream-muted">Loading settings…</p>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2 block">
                <span className="text-[11px] tracking-[0.25em] uppercase text-cream-muted">
                  Disclaimer note
                </span>
                <textarea
                  rows={2}
                  value={settingsForm.note}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, note: e.target.value })
                  }
                  className="mt-2 w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] tracking-[0.25em] uppercase text-cream-muted">
                  Extra bed (INR)
                </span>
                <input
                  type="number"
                  min="0"
                  value={settingsForm.extra_bed}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, extra_bed: e.target.value })
                  }
                  className="mt-2 w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[11px] tracking-[0.25em] uppercase text-cream-muted">
                  GST label
                </span>
                <input
                  type="text"
                  value={settingsForm.gst}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, gst: e.target.value })
                  }
                  className="mt-2 w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
                />
              </label>
              <label className="sm:col-span-2 block">
                <span className="text-[11px] tracking-[0.25em] uppercase text-cream-muted">
                  Cancellation policy
                </span>
                <textarea
                  rows={3}
                  value={settingsForm.cancellation_policy}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      cancellation_policy: e.target.value,
                    })
                  }
                  className="mt-2 w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={settingsSaving}
                className="sm:col-span-2 inline-flex w-fit items-center gap-2 bg-gold px-6 py-3 text-xs tracking-[0.22em] uppercase text-cream hover:bg-gold-soft disabled:opacity-50"
              >
                {settingsSaving && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                )}
                Save Settings
              </button>
            </div>
          )}
        </form>
      )}

      <div className="mt-8 overflow-x-auto border border-ink-line">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="bg-ink-soft">
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Hotel / Room
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Meal Plan
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Occupancy
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Rate
              </th>
              <th className="px-4 py-4 text-[10px] tracking-[0.22em] uppercase text-gold">
                Season
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
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-cream-muted">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
                    Loading tariffs…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-sm text-cream-muted">
                  No tariff rates found.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const priceLabel = formatPrice(row.price);
                return (
                  <tr
                    key={row.id}
                    className="border-t border-ink-line transition-colors hover:bg-ink-soft/60"
                  >
                    <td className="px-4 py-4 text-sm text-cream-dim">
                      <div className="font-display text-base text-cream">
                        {row.hotel_name}
                      </div>
                      <div className="mt-1 text-xs text-cream-muted">
                        {row.room_type_name || "All room types"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-cream-dim">
                      {mealPlanLabel(row.meal_plan)}
                    </td>
                    <td className="px-4 py-4 text-sm text-cream-dim">
                      {occupancyLabel(row.occupancy)}
                    </td>
                    <td className="px-4 py-4 text-sm text-cream-dim">
                      {priceLabel || (
                        <span className="italic text-cream-muted">
                          {row.display_note || "Available with room plan"}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-cream-muted">
                      {row.valid_from || row.valid_to
                        ? `${row.valid_from || "…"} → ${row.valid_to || "…"}`
                        : "Year-round"}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/tariffs/${row.id}/edit`}
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
                          {row.status === "active" ? "Deactivate" : "Activate"}
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
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete tariff rate?"
        message={
          deleteTarget
            ? `Delete ${mealPlanLabel(deleteTarget.meal_plan)} / ${occupancyLabel(deleteTarget.occupancy)} for ${deleteTarget.hotel_name}?`
            : ""
        }
        confirmLabel="Delete Rate"
        cancelLabel="Cancel"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => (!deleting ? setDeleteTarget(null) : null)}
      />
    </div>
  );
}
