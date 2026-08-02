"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import HotelForm from "@/components/admin/HotelForm";
import { useToast } from "@/components/admin/Toast";
import {
  getAdminHotel,
  updateAdminHotel,
  hotelToForm,
  formToPayload,
  validateHotelForm,
  formatApiError,
} from "@/lib/adminHotels";
import { clearAdminSession } from "@/lib/adminAuth";

export default function EditHotelPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await getAdminHotel(id);
      if (cancelled) return;

      if (result.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (!result.ok) {
        const message = formatApiError(result, "Hotel not found.");
        setError(message);
        toast.error(message);
        setLoading(false);
        return;
      }

      setForm(hotelToForm(result.data?.data));
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

    const validation = validateHotelForm(form);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setError("Please fix the highlighted fields.");
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setSaving(true);
    setError("");
    setFieldErrors({});

    const result = await updateAdminHotel(id, formToPayload(form));

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      const message = formatApiError(result, "Unable to update hotel.");
      setError(message);
      toast.error(message);
      setSaving(false);
      return;
    }

    toast.success("Hotel updated successfully.");
    router.replace(`/admin/hotels/${id}`);
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
          href="/admin/hotels"
          className="text-[11px] tracking-[0.22em] uppercase text-cream-muted hover:text-gold"
        >
          ← Hotels
        </Link>
        <p role="alert" className="mt-6 text-sm text-gold">
          {error || "Hotel not found."}
        </p>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/admin/hotels/${id}`}
        className="text-[11px] tracking-[0.22em] uppercase text-cream-muted hover:text-gold"
      >
        ← Hotel details
      </Link>
      <h1 className="mt-6 font-display text-4xl text-cream">Edit Hotel</h1>
      <p className="mt-3 text-sm text-cream-dim">
        Update fields from the hotels database schema.
      </p>
      <div className="mt-10">
        <HotelForm
          form={form}
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
