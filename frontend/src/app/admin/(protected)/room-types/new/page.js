"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoomTypeForm from "@/components/admin/RoomTypeForm";
import { useToast } from "@/components/admin/Toast";
import {
  emptyRoomTypeForm,
  formToRoomTypePayload,
  createAdminRoomType,
  validateRoomTypeForm,
  formatApiError,
} from "@/lib/adminRoomTypes";
import { listAdminHotels } from "@/lib/adminHotels";
import { clearAdminSession } from "@/lib/adminAuth";

export default function NewRoomTypePage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(() => emptyRoomTypeForm());
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function loadHotels() {
      const result = await listAdminHotels({ status: "active" });
      if (cancelled) return;
      if (result.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }
      // Prefer active hotels, but fall back to full list if none.
      let list = result.ok ? result.data?.data || [] : [];
      if (list.length === 0) {
        const all = await listAdminHotels();
        if (cancelled) return;
        if (all.unauthorized) {
          clearAdminSession();
          router.replace("/admin/login");
          return;
        }
        list = all.ok ? all.data?.data || [] : [];
      }
      setHotels(list);
    }
    loadHotels();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    const validation = validateRoomTypeForm(form);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setError("Please fix the highlighted fields.");
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    const result = await createAdminRoomType(formToRoomTypePayload(form));

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      const message = formatApiError(result, "Unable to create room type.");
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    toast.success("Room type created successfully.");
    router.replace("/admin/room-types");
  }

  return (
    <div>
      <Link
        href="/admin/room-types"
        className="text-[11px] tracking-[0.22em] uppercase text-cream-muted transition-colors hover:text-gold"
      >
        ← Room Types
      </Link>
      <h1 className="mt-6 font-display text-4xl text-cream">Add Room Type</h1>
      <p className="mt-3 text-sm text-cream-dim">
        Create a room type for a hotel. Fields match the room_types schema.
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
          submitLabel="Create Room Type"
          isLoading={loading}
          errorMessage={error}
          fieldErrors={fieldErrors}
          autoSlugFromName
        />
      </div>
    </div>
  );
}
