"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HotelForm from "@/components/admin/HotelForm";
import { useToast } from "@/components/admin/Toast";
import {
  emptyHotelForm,
  formToPayload,
  createAdminHotel,
  validateHotelForm,
  formatApiError,
} from "@/lib/adminHotels";
import { clearAdminSession } from "@/lib/adminAuth";

export default function NewHotelPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(() => emptyHotelForm());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    const validation = validateHotelForm(form);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setError("Please fix the highlighted fields.");
      toast.error("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    setError("");
    setFieldErrors({});

    const result = await createAdminHotel(formToPayload(form));

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      const message = formatApiError(result, "Unable to create hotel.");
      setError(message);
      toast.error(message);
      setLoading(false);
      return;
    }

    const id = result.data?.data?.id;
    toast.success("Hotel created successfully.");
    router.replace(id ? `/admin/hotels/${id}` : "/admin/hotels");
  }

  return (
    <div>
      <Link
        href="/admin/hotels"
        className="text-[11px] tracking-[0.22em] uppercase text-cream-muted transition-colors hover:text-gold"
      >
        ← Hotels
      </Link>
      <h1 className="mt-6 font-display text-4xl text-cream">Add Hotel</h1>
      <p className="mt-3 text-sm text-cream-dim">
        Create a new property. Fields match the hotels database schema.
      </p>
      <div className="mt-10">
        <HotelForm
          form={form}
          onChange={(next) => {
            setForm(next);
            setFieldErrors({});
          }}
          onSubmit={handleSubmit}
          submitLabel="Create Hotel"
          isLoading={loading}
          errorMessage={error}
          fieldErrors={fieldErrors}
          autoSlugFromName
        />
      </div>
    </div>
  );
}
