"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import RoomTypeForm from "@/components/admin/RoomTypeForm";
import { useToast } from "@/components/admin/Toast";
import {
  getAdminRoomType,
  updateAdminRoomType,
  roomTypeToForm,
  formToRoomTypePayload,
  validateRoomTypeForm,
  formatApiError,
} from "@/lib/adminRoomTypes";
import { listAdminHotels } from "@/lib/adminHotels";
import { clearAdminSession } from "@/lib/adminAuth";

export default function EditRoomTypePage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [roomResult, hotelsResult] = await Promise.all([
        getAdminRoomType(id),
        listAdminHotels(),
      ]);
      if (cancelled) return;

      if (roomResult.unauthorized || hotelsResult.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (hotelsResult.ok) {
        setHotels(hotelsResult.data?.data || []);
      }

      if (!roomResult.ok) {
        const message = formatApiError(roomResult, "Room type not found.");
        setError(message);
        toast.error(message);
        setLoading(false);
        return;
      }

      setForm(roomTypeToForm(roomResult.data?.data));
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, router, toast]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving || !form) return;

    const validation = validateRoomTypeForm(form);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setError("Please fix the highlighted fields.");
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors({});

    const result = await updateAdminRoomType(id, formToRoomTypePayload(form));

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      const message = formatApiError(result, "Unable to update room type.");
      setError(message);
      toast.error(message);
      setSaving(false);
      return;
    }

    toast.success("Room type updated successfully.");
    router.replace("/admin/room-types");
  }

  if (loading) {
    return (
      <p className="inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
        <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
        Loading…
      </p>
    );
  }

  if (!form) {
    return (
      <div>
        <Link
          href="/admin/room-types"
          className="text-[11px] tracking-[0.22em] uppercase text-cream-muted hover:text-gold"
        >
          ← Room Types
        </Link>
        <p role="alert" className="mt-6 text-sm text-gold">
          {error || "Room type not found."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/room-types"
        className="text-[11px] tracking-[0.22em] uppercase text-cream-muted hover:text-gold"
      >
        ← Room Types
      </Link>
      <h1 className="mt-6 font-display text-4xl text-cream">Edit Room Type</h1>
      <p className="mt-3 text-sm text-cream-dim">
        Update fields from the room_types database schema.
      </p>
      <div className="mt-10">
        <RoomTypeForm
          form={form}
          hotels={hotels}
          onChange={(next) => {
            setForm(next);
            setFieldErrors({});
          }}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          isLoading={saving}
          errorMessage={error}
          fieldErrors={fieldErrors}
        />
      </div>
    </div>
  );
}
