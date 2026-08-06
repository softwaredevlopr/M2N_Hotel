"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  INQUIRY_STATUSES,
  deleteAdminInquiry,
  formatApiError,
  getAdminInquiry,
  updateAdminInquiryStatus,
} from "@/lib/adminInquiries";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { useToast } from "@/components/admin/Toast";

function Row({ label, value }) {
  return (
    <div className="border-t border-ink-line py-4 sm:grid sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-cream sm:mt-0 whitespace-pre-wrap">
        {value || "—"}
      </dd>
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

function formatDate(iso) {
  if (!iso) return null;
  return String(iso).slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminInquiryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    const result = await getAdminInquiry(id);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      const message = formatApiError(result, "Unable to load inquiry.");
      setError(message);
      setInquiry(null);
      setLoading(false);
      return;
    }

    const data = result.data?.data || null;
    setInquiry(data);
    setStatus(data?.status || "");
    setAdminNotes(data?.admin_notes || "");
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusSave(event) {
    event.preventDefault();
    if (!inquiry || saving) return;

    if (!INQUIRY_STATUSES.includes(status)) {
      toast.error("Select a valid status.");
      return;
    }

    setSaving(true);
    const result = await updateAdminInquiryStatus(inquiry.id, {
      status,
      admin_notes: adminNotes.trim() || undefined,
    });
    setSaving(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Unable to update inquiry."));
      return;
    }

    const updated = result.data?.data;
    // Status update returns a slim row — reload full joined record.
    toast.success("Inquiry updated.");
    if (updated) {
      setInquiry((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              hotel_name: prev.hotel_name,
              hotel_slug: prev.hotel_slug,
              room_type_name: prev.room_type_name,
              room_type_slug: prev.room_type_slug,
            }
          : updated
      );
      setStatus(updated.status);
      setAdminNotes(updated.admin_notes || "");
    } else {
      load();
    }
  }

  async function confirmDelete() {
    if (!inquiry || deleting) return;
    setDeleting(true);
    const result = await deleteAdminInquiry(inquiry.id);
    setDeleting(false);

    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }

    if (!result.ok) {
      toast.error(formatApiError(result, "Delete failed."));
      return;
    }

    toast.success("Inquiry deleted.");
    router.replace("/admin/inquiries");
  }

  if (loading) {
    return (
      <p className="inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
        <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
        Loading inquiry…
      </p>
    );
  }

  if (error || !inquiry) {
    return (
      <div>
        <Link
          href="/admin/inquiries"
          className="text-[11px] tracking-[0.22em] uppercase text-cream-muted transition-colors hover:text-gold"
        >
          ← Inquiries
        </Link>
        <div
          role="alert"
          className="mt-8 border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
        >
          {error || "Inquiry not found."}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/admin/inquiries"
        className="text-[11px] tracking-[0.22em] uppercase text-cream-muted transition-colors hover:text-gold"
      >
        ← Inquiries
      </Link>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Inquiry
          </span>
          <div className="gold-divider mt-5" />
          <h1 className="mt-8 font-display text-3xl text-cream sm:text-4xl">
            {inquiry.guest_name}
          </h1>
          <p className="mt-2 text-sm text-cream-dim">{inquiry.hotel_name}</p>
          <div className="mt-4">
            <StatusBadge status={inquiry.status} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="inline-flex items-center justify-center border border-ink-line px-5 py-3 text-[11px] tracking-[0.22em] uppercase text-cream-muted transition-colors hover:border-gold hover:text-gold"
        >
          Delete
        </button>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Guest">
          <dl>
            <Row label="Name" value={inquiry.guest_name} />
            <Row label="Email" value={inquiry.guest_email} />
            <Row label="Phone" value={inquiry.guest_phone} />
            <Row
              label="Source"
              value={(inquiry.source || "").replace(/_/g, " ")}
            />
            <Row label="Received" value={formatDateTime(inquiry.created_at)} />
            <Row label="Updated" value={formatDateTime(inquiry.updated_at)} />
          </dl>
        </Section>

        <Section title="Stay request">
          <dl>
            <Row label="Hotel" value={inquiry.hotel_name} />
            <Row label="Room type" value={inquiry.room_type_name} />
            <Row label="Check-in" value={formatDate(inquiry.check_in_date)} />
            <Row label="Check-out" value={formatDate(inquiry.check_out_date)} />
            <Row
              label="Guests"
              value={`${inquiry.adults_count} adult(s)${
                Number(inquiry.children_count) > 0
                  ? `, ${inquiry.children_count} child(ren)`
                  : ""
              }`}
            />
          </dl>
        </Section>

        <Section title="Guest message">
          <p className="mt-4 text-sm leading-relaxed text-cream-dim whitespace-pre-wrap">
            {inquiry.message || "No message provided."}
          </p>
        </Section>

        <Section title="Update status">
          <form onSubmit={handleStatusSave} className="mt-4 space-y-5">
            <div>
              <label
                htmlFor="inq-status"
                className="mb-2 block text-[11px] tracking-[0.25em] uppercase text-cream-muted"
              >
                Status
              </label>
              <select
                id="inq-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full border border-ink-line bg-ink px-4 py-3 text-sm text-cream focus:border-gold focus:outline-none"
              >
                {INQUIRY_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {value.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="inq-notes"
                className="mb-2 block text-[11px] tracking-[0.25em] uppercase text-cream-muted"
              >
                Admin notes
              </label>
              <textarea
                id="inq-notes"
                rows={4}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                maxLength={4000}
                className="w-full border border-ink-line bg-ink px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:border-gold focus:outline-none"
                placeholder="Internal follow-up notes…"
              />
              <p className="mt-1.5 text-xs text-cream-muted">
                Uses the existing admin_notes field. Leave blank to keep the
                current notes.
              </p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 bg-gold px-6 py-3 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:bg-gold-soft disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </button>
          </form>
        </Section>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete inquiry?"
        message={`Delete inquiry from “${inquiry.guest_name}”? This cannot be undone.`}
        confirmLabel="Delete Inquiry"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => (!deleting ? setDeleteOpen(false) : null)}
      />
    </div>
  );
}
