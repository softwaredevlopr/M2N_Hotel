"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoomForm from "@/components/admin/RoomForm";
import { useToast } from "@/components/admin/Toast";
import {
  emptyRoomForm,
  formToRoomPayload,
  createAdminRoom,
  validateRoomForm,
  formatApiError,
} from "@/lib/adminRooms";
import { listAdminHotels } from "@/lib/adminHotels";
import { listAdminRoomTypes } from "@/lib/adminRoomTypes";
import { clearAdminSession } from "@/lib/adminAuth";

export default function NewRoomPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(() => emptyRoomForm());
  const [hotels, setHotels] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

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

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    const validation = validateRoomForm(form);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setError("Please fix the highlighted fields.");
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    const result = await createAdminRoom(formToRoomPayload(form));

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      const message = formatApiError(result, "Unable to create room.");
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    toast.success("Room created successfully.");
    router.replace("/admin/rooms");
  }

  return (
    <div>
      <Link
        href="/admin/rooms"
        className="text-[11px] tracking-[0.22em] uppercase text-cream-muted transition-colors hover:text-gold"
      >
        ← Rooms
      </Link>
      <h1 className="mt-6 font-display text-4xl text-cream">Add Room</h1>
      <p className="mt-3 text-sm text-cream-dim">
        Create a physical room. Fields match the rooms database schema.
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
          submitLabel="Create Room"
          isLoading={loading}
          errorMessage={error}
          fieldErrors={fieldErrors}
        />
      </div>
    </div>
  );
}
