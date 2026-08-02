"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { listAdminHotels } from "@/lib/adminHotels";
import { listAdminRoomTypes } from "@/lib/adminRoomTypes";
import {
  createAdminTariff,
  emptyTariffForm,
  formToTariffPayload,
  validateTariffForm,
  formatApiError,
} from "@/lib/adminTariffs";
import { clearAdminSession } from "@/lib/adminAuth";
import TariffForm from "@/components/admin/TariffForm";
import { useToast } from "@/components/admin/Toast";

export default function AdminNewTariffPage() {
  const router = useRouter();
  const toast = useToast();
  const [form, setForm] = useState(emptyTariffForm());
  const [hotels, setHotels] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

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
      if (!form.hotel_id) {
        setRoomTypes([]);
        return;
      }
      const result = await listAdminRoomTypes({ hotel_id: form.hotel_id });
      if (cancelled) return;
      if (result.ok) setRoomTypes(result.data?.data || []);
    }
    loadRoomTypes();
    return () => {
      cancelled = true;
    };
  }, [form.hotel_id]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading) return;

    const validation = validateTariffForm(form);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setErrorMessage("Please review the highlighted fields.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setFieldErrors({});

    const result = await createAdminTariff(formToTariffPayload(form));
    setLoading(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      const apiErrors = result.data?.errors;
      if (Array.isArray(apiErrors) && apiErrors.length > 0) {
        setErrorMessage(apiErrors.join(" "));
      } else {
        setErrorMessage(formatApiError(result, "Unable to create tariff rate."));
      }
      return;
    }

    toast.success("Tariff rate created.");
    router.push("/admin/tariffs");
  }

  return (
    <div>
      <Link
        href="/admin/tariffs"
        className="text-xs tracking-[0.22em] uppercase text-cream-muted hover:text-gold"
      >
        ← Back to tariffs
      </Link>
      <div className="mt-6">
        <span className="text-xs tracking-[0.45em] uppercase text-gold">
          Add Tariff
        </span>
        <div className="gold-divider mt-5" />
        <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
          New Tariff Rate
        </h1>
      </div>

      <div className="mt-10 max-w-3xl">
        <TariffForm
          form={form}
          hotels={hotels}
          roomTypes={roomTypes}
          onChange={setForm}
          onSubmit={handleSubmit}
          submitLabel="Create Rate"
          isLoading={loading}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
        />
      </div>
    </div>
  );
}
