"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { adminOnboard } from "@/lib/api";
import { getAdminToken, setAdminSession } from "@/lib/adminAuth";
import { slugifyHotelName } from "@/lib/adminHotels";
import { BRAND_NAME } from "@/lib/brand";

const INPUT_CLASS =
  "w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:outline-none focus:border-gold transition-colors";
const LABEL_CLASS =
  "block text-[11px] tracking-[0.25em] uppercase text-cream-muted mb-2";

const EMPTY_FORM = {
  tenant_name: "",
  tenant_slug: "",
  owner_name: "",
  owner_email: "",
  owner_password: "",
  hotel_name: "",
  hotel_slug: "",
  city: "",
  state: "",
  country: "",
  phone: "",
};

function userFacingOnboardError(result) {
  if (result?.networkError) {
    return "Unable to reach the server. Please check your connection and try again.";
  }
  if (result?.status === 429) {
    return "Too many onboarding attempts. Please wait a while and try again.";
  }
  if (result?.status === 409) {
    return "Unable to create account with the provided details.";
  }
  if (result?.status === 400) {
    const errors = result?.data?.errors;
    if (Array.isArray(errors) && errors.length > 0) {
      return errors.join(" ");
    }
    return (
      result?.data?.message ||
      "Please check the form fields and try again."
    );
  }
  return (
    result?.data?.message ||
    "Unable to create your account. Please try again."
  );
}

export default function AdminOnboardingPage() {
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);
  const [tenantSlugTouched, setTenantSlugTouched] = useState(false);
  const [hotelSlugTouched, setHotelSlugTouched] = useState(false);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (getAdminToken()) {
      router.replace("/admin/dashboard");
    }
  }, [router]);

  function updateField(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "tenant_name" && !tenantSlugTouched) {
        next.tenant_slug = slugifyHotelName(value);
      }
      if (field === "hotel_name" && !hotelSlugTouched) {
        next.hotel_slug = slugifyHotelName(value);
      }
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "loading") return;

    const tenantName = form.tenant_name.trim();
    const tenantSlug = form.tenant_slug.trim();
    const ownerName = form.owner_name.trim();
    const ownerEmail = form.owner_email.trim();
    const ownerPassword = form.owner_password;
    const hotelName = form.hotel_name.trim();
    const hotelSlug = form.hotel_slug.trim();

    if (
      !tenantName ||
      !tenantSlug ||
      !ownerName ||
      !ownerEmail ||
      !ownerPassword ||
      !hotelName ||
      !hotelSlug
    ) {
      setErrorMessage("Please fill in all required fields.");
      setStatus("error");
      return;
    }

    if (ownerPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    const payload = {
      tenant_name: tenantName,
      tenant_slug: tenantSlug,
      owner_name: ownerName,
      owner_email: ownerEmail,
      owner_password: ownerPassword,
      hotel_name: hotelName,
      hotel_slug: hotelSlug,
    };

    const city = form.city.trim();
    const state = form.state.trim();
    const country = form.country.trim();
    const phone = form.phone.trim();
    if (city) payload.city = city;
    if (state) payload.state = state;
    if (country) payload.country = country;
    if (phone) payload.phone = phone;

    const result = await adminOnboard(payload);

    if (!result.ok) {
      setErrorMessage(userFacingOnboardError(result));
      setStatus("error");
      return;
    }

    const payloadData = result.data?.data;
    const token = payloadData?.access_token;
    const admin = payloadData?.admin;

    if (!token) {
      setErrorMessage("Account created but no access token was returned.");
      setStatus("error");
      return;
    }

    setAdminSession(token, admin);
    router.replace("/admin/dashboard");
  }

  const isLoading = status === "loading";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(215,25,32,0.18), transparent)",
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-lg">
        <div className="text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Create Hotel Account
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h1 className="mt-8 font-display text-4xl leading-tight text-cream sm:text-5xl">
            Start with
            <br />
            <span className="italic text-gold">{BRAND_NAME}</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-cream-dim">
            Register your operator account and first hotel property to open the
            admin console.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-10 border border-ink-line bg-ink-soft p-6 sm:p-8"
          aria-busy={isLoading}
          noValidate
        >
          {status === "error" && errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 flex gap-3 border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
            >
              <AlertCircle
                className="h-5 w-5 flex-shrink-0 text-gold"
                strokeWidth={1.5}
              />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="space-y-5">
            <p className="text-[11px] tracking-[0.25em] uppercase text-gold">
              Operator
            </p>

            <div>
              <label htmlFor="tenant_name" className={LABEL_CLASS}>
                Company / operator name
              </label>
              <input
                id="tenant_name"
                type="text"
                required
                value={form.tenant_name}
                onChange={(e) => updateField("tenant_name", e.target.value)}
                className={INPUT_CLASS}
                placeholder="Aurelia Hospitality"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="tenant_slug" className={LABEL_CLASS}>
                Operator slug
              </label>
              <input
                id="tenant_slug"
                type="text"
                required
                value={form.tenant_slug}
                onChange={(e) => {
                  setTenantSlugTouched(true);
                  updateField("tenant_slug", e.target.value);
                }}
                className={INPUT_CLASS}
                placeholder="aurelia-hospitality"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="owner_name" className={LABEL_CLASS}>
                Your full name
              </label>
              <input
                id="owner_name"
                type="text"
                required
                autoComplete="name"
                value={form.owner_name}
                onChange={(e) => updateField("owner_name", e.target.value)}
                className={INPUT_CLASS}
                placeholder="Jane Operator"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="owner_email" className={LABEL_CLASS}>
                Work email
              </label>
              <input
                id="owner_email"
                type="email"
                required
                autoComplete="email"
                value={form.owner_email}
                onChange={(e) => updateField("owner_email", e.target.value)}
                className={INPUT_CLASS}
                placeholder="owner@example.com"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="owner_password" className={LABEL_CLASS}>
                Password
              </label>
              <input
                id="owner_password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.owner_password}
                onChange={(e) => updateField("owner_password", e.target.value)}
                className={INPUT_CLASS}
                placeholder="At least 8 characters"
                disabled={isLoading}
              />
            </div>

            <div className="gold-divider my-2 opacity-40" />

            <p className="text-[11px] tracking-[0.25em] uppercase text-gold">
              First hotel
            </p>

            <div>
              <label htmlFor="hotel_name" className={LABEL_CLASS}>
                Hotel name
              </label>
              <input
                id="hotel_name"
                type="text"
                required
                value={form.hotel_name}
                onChange={(e) => updateField("hotel_name", e.target.value)}
                className={INPUT_CLASS}
                placeholder="Grand City Hotel"
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="hotel_slug" className={LABEL_CLASS}>
                Hotel slug
              </label>
              <input
                id="hotel_slug"
                type="text"
                required
                value={form.hotel_slug}
                onChange={(e) => {
                  setHotelSlugTouched(true);
                  updateField("hotel_slug", e.target.value);
                }}
                className={INPUT_CLASS}
                placeholder="grand-city-hotel"
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="city" className={LABEL_CLASS}>
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={form.city}
                  onChange={(e) => updateField("city", e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Optional"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="state" className={LABEL_CLASS}>
                  State
                </label>
                <input
                  id="state"
                  type="text"
                  value={form.state}
                  onChange={(e) => updateField("state", e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Optional"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="country" className={LABEL_CLASS}>
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  value={form.country}
                  onChange={(e) => updateField("country", e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="India"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="phone" className={LABEL_CLASS}>
                  Phone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Optional"
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 bg-gold px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            )}
            {isLoading ? "Creating account…" : "Create account"}
          </button>

          <p className="mt-6 text-center text-sm text-cream-muted">
            Already have an account?{" "}
            <Link
              href="/admin/login"
              className="text-gold transition-colors hover:text-gold-soft"
            >
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
