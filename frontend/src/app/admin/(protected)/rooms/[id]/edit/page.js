"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import RoomForm from "@/components/admin/RoomForm";
import { useToast } from "@/components/admin/Toast";
import {
  getAdminRoom,
  updateAdminRoom,
  roomToForm,
  formToRoomPayload,
  validateRoomForm,
  formatApiError,
} from "@/lib/adminRooms";
import { listAdminHotels } from "@/lib/adminHotels";
import { listAdminRoomTypes } from "@/lib/adminRoomTypes";
import { clearAdminSession } from "@/lib/adminAuth";

export default function EditRoomPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [roomResult, hotelsResult, typesResult] = await Promise.all([
        getAdminRoom(id),
        listAdminHotels(),
        listAdminRoomTypes(),
      ]);
      if (cancelled) return;

      if (
        roomResult.unauthorized ||
        hotelsResult.unauthorized ||
        typesResult.unauthorized
      ) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (hotelsResult.ok) setHotels(hotelsResult.data?.data || []);
      if (typesResult.ok) setRoomTypes(typesResult.data?.data || []);

      if (!roomResult.ok) {
        const message = formatApiError(roomResult, "Room not found.");
        setError(message);
        toast.error(message);
        setLoading(false);
        return;
      }

      setForm(roomToForm(roomResult.data?.data));
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

    const validation = validateRoomForm(form);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setError("Please fix the highlighted fields.");
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors({});

    const result = await updateAdminRoom(id, formToRoomPayload(form));

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      const message = formatApiError(result, "Unable to update room.");
      setError(message);
      toast.error(message);
      setSaving(false);
      return;
    }

    toast.success("Room updated successfully.");
    router.replace("/admin/rooms");
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
          href="/admin/rooms"
          className="text-[11px] tracking-[0.22em] uppercase text-cream-muted hover:text-gold"
        >
          ← Rooms
        </Link>
        <p role="alert" className="mt-6 text-sm text-gold">
          {error || "Room not found."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/rooms"
        className="text-[11px] tracking-[0.22em] uppercase text-cream-muted hover:text-gold"
      >
        ← Rooms
      </Link>
      <h1 className="mt-6 font-display text-4xl text-cream">Edit Room</h1>
      <p className="mt-3 text-sm text-cream-dim">
        Update fields from the rooms database schema.
      </p>
      <div className="mt-10">
        <RoomForm
          form={form}
          hotels={hotels}
          roomTypes={roomTypes}
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
