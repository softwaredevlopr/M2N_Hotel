"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { clearAdminSession, getAdminProfile } from "@/lib/adminAuth";
import { formatApiError, getAdminTenant } from "@/lib/adminTenant";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/Toast";

function Row({ label, value }) {
  return (
    <div className="border-t border-ink-line py-4 sm:grid sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-cream sm:mt-0">{value ?? "—"}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="border border-ink-line bg-ink-soft p-5 sm:p-6">
      <h2 className="text-[11px] tracking-[0.25em] uppercase text-gold">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function humanizeCode(value) {
  if (!value) return "—";
  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function AdminBillingPage() {
  const router = useRouter();
  const toast = useToast();
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const adminProfile = getAdminProfile();

  useEffect(() => {
    let cancelled = false;

    async function loadTenant() {
      setLoading(true);
      setErrorMessage("");

      const result = await getAdminTenant();

      if (cancelled) return;

      if (result.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (!result.ok) {
        const message = formatApiError(
          result,
          "Unable to load billing information."
        );
        setErrorMessage(message);
        setTenant(null);
        setLoading(false);
        toast.error(message);
        return;
      }

      setTenant(result.data?.data || null);
      setLoading(false);
    }

    loadTenant();

    return () => {
      cancelled = true;
    };
  }, [router, toast]);

  const billingEmailDisplay =
    tenant?.billing_email?.trim() || adminProfile?.email || "—";

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] tracking-[0.35em] uppercase text-gold">
            Operator Account
          </p>
          <h1 className="mt-2 font-display text-3xl text-cream sm:text-4xl">
            Billing &amp; Plan
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-dim">
            Read-only summary of your operator account, subscription status, and
            billing contact details.
          </p>
        </div>
      </div>

      <div className="border border-gold/30 bg-gold/5 p-4 text-sm leading-relaxed text-cream-dim">
        Billing management, plan changes, and payment gateway integration will be
        added in a later phase.
      </div>

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading billing summary…
        </p>
      ) : errorMessage ? (
        <div
          role="alert"
          className="border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
        >
          {errorMessage}
        </div>
      ) : tenant ? (
        <Section title="Current plan">
          <dl>
            <Row label="Operator name" value={tenant.name} />
            <Row label="Slug" value={tenant.slug} />
            <Row
              label="Plan"
              value={humanizeCode(tenant.plan_code)}
            />
            <Row
              label="Subscription status"
              value={<StatusBadge status={tenant.subscription_status} />}
            />
            <Row
              label="Account status"
              value={<StatusBadge status={tenant.status} />}
            />
            <Row label="Billing email" value={billingEmailDisplay} />
            <Row
              label="Trial ends"
              value={formatDateTime(tenant.trial_ends_at)}
            />
            <Row
              label="Current period ends"
              value={formatDateTime(tenant.current_period_end)}
            />
          </dl>
        </Section>
      ) : (
        <p className="text-sm text-cream-muted">No billing information available.</p>
      )}
    </div>
  );
}
