"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { listAdminHotels } from "@/lib/adminHotels";
import { listAdminRoomTypes } from "@/lib/adminRoomTypes";
import {
  getAdminTariff,
  updateAdminTariff,
  tariffToForm,
  formToTariffPayload,
  validateTariffForm,
  formatApiError,
} from "@/lib/adminTariffs";
import { clearAdminSession } from "@/lib/adminAuth";
import TariffForm from "@/components/admin/TariffForm";
import { useToast } from "@/components/admin/Toast";

export default function AdminEditTariffPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const toast = useToast();
  const [form, setForm] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [hotelsResult, tariffResult] = await Promise.all([
        listAdminHotels(),
        getAdminTariff(id),
      ]);
      if (cancelled) return;

      if (hotelsResult.unauthorized || tariffResult.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (hotelsResult.ok) setHotels(hotelsResult.data?.data || []);

      if (!tariffResult.ok) {
        toast.error(formatApiError(tariffResult, "Tariff rate not found."));
        router.replace("/admin/tariffs");
        return;
      }

      setForm(tariffToForm(tariffResult.data?.data));
      setPageLoading(false);
    }
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id, router, toast]);

  useEffect(() => {
    let cancelled = false;
    async function loadRoomTypes() {
      if (!form?.hotel_id) {
        setRoomTypes([]);
        return;
      }
      const result = await listAdminRoomTypes({ hotel_id: form.hotel_id });
      if (cancelled) return;
      if (result.ok) setRoomTypes(result.data?.data || []);
    }
    if (form) loadRoomTypes();
    return () => {
      cancelled = true;
    };
  }, [form?.hotel_id]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (loading || !form) return;

    const validation = validateTariffForm(form);
    if (!validation.ok) {
      setFieldErrors(validation.fieldErrors);
      setErrorMessage("Please review the highlighted fields.");
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setFieldErrors({});

    const result = await updateAdminTariff(id, formToTariffPayload(form));
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
        setErrorMessage(formatApiError(result, "Unable to update tariff rate."));
      }
      return;
    }

    toast.success("Tariff rate updated.");
    router.push("/admin/tariffs");
  }

  if (pageLoading || !form) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <span className="inline-flex items-center gap-2 text-sm text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading tariff…
        </span>
      </div>
    );
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
          Edit Tariff
        </span>
        <div className="gold-divider mt-5" />
        <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
          Edit Tariff Rate
        </h1>
      </div>

      <div className="mt-10 max-w-3xl">
        <TariffForm
          form={form}
          hotels={hotels}
          roomTypes={roomTypes}
          onChange={setForm}
          onSubmit={handleSubmit}
          submitLabel="Save Changes"
          isLoading={loading}
          errorMessage={errorMessage}
          fieldErrors={fieldErrors}
        />
      </div>
    </div>
  );
}
