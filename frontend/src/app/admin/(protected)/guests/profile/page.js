"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { formatApiError, getAdminGuestProfile } from "@/lib/adminGuests";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";

function formatDate(iso) {
  if (!iso) return "—";
  return String(iso).slice(0, 10);
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

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-[11px] tracking-[0.25em] uppercase text-gold">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function AdminGuestProfilePage() {
  return (
    <Suspense
      fallback={
        <p className="inline-flex items-center gap-2 text-sm tracking-[0.2em] uppercase text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading…
        </p>
      }
    >
      <AdminGuestProfilePageInner />
    </Suspense>
  );
}

function AdminGuestProfilePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hotelId = searchParams.get("hotel_id") || "";
  const key = searchParams.get("key") || "";

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!hotelId || !key) {
      setProfile(null);
      setLoading(false);
      setError("Select a hotel and guest from the guests list.");
      return;
    }
    setLoading(true);
    setError("");
    const result = await getAdminGuestProfile({ hotel_id: hotelId, key });
    if (result.unauthorized) {
      clearAdminSession();
      router.replace("/admin/login");
      return;
    }
    if (!result.ok) {
      setProfile(null);
      setError(formatApiError(result, "Unable to load guest 360."));
      setLoading(false);
      return;
    }
    const payload = result.data?.data;
    if (result.data?.hotel_id && result.data.hotel_id !== hotelId) {
      setProfile(null);
      setError("This guest record belongs to another hotel.");
      setLoading(false);
      return;
    }
    setProfile(payload || null);
    setLoading(false);
  }, [hotelId, key, router]);

  useEffect(() => {
    load();
  }, [load]);

  const contact = profile?.contact;
  const summary = profile?.summary;
  const listHref = hotelId
    ? `/admin/guests?hotel_id=${encodeURIComponent(hotelId)}`
    : "/admin/guests";

  return (
    <div>
      <Link
        href={listHref}
        className="text-[11px] tracking-[0.2em] uppercase text-cream-muted hover:text-gold"
      >
        ← Guests
      </Link>
      <div className="gold-divider mt-5" />
      <h1 className="mt-8 font-display text-4xl text-cream sm:text-5xl">
        {contact?.display_name || "Guest 360"}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-cream-dim">
        Derived from bookings and inquiries at this hotel. Contact is the most
        recent source row. Changing email on a later stay creates a separate
        guest.
      </p>

      {loading ? (
        <p className="mt-10 inline-flex items-center gap-2 text-sm text-cream-muted">
          <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
          Loading guest…
        </p>
      ) : error ? (
        <p className="mt-10 text-sm text-cream-muted">{error}</p>
      ) : profile ? (
        <>
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="border border-ink-line bg-ink-soft p-5">
              <div className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                Bookings
              </div>
              <div className="mt-3 font-display text-3xl text-gold">
                {summary?.booking_count ?? 0}
              </div>
            </div>
            <div className="border border-ink-line bg-ink-soft p-5">
              <div className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                Inquiries
              </div>
              <div className="mt-3 font-display text-3xl text-gold">
                {summary?.inquiry_count ?? 0}
              </div>
            </div>
            <div className="border border-ink-line bg-ink-soft p-5">
              <div className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                Stays
              </div>
              <div className="mt-3 font-display text-3xl text-gold">
                {summary?.stay_count ?? 0}
              </div>
              <p className="mt-2 text-xs text-cream-dim">
                Checked in or checked out
              </p>
            </div>
            <div className="border border-ink-line bg-ink-soft p-5">
              <div className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                Repeat
              </div>
              <div className="mt-3 font-display text-3xl text-gold">
                {summary?.is_repeat_guest ? "Yes" : "No"}
              </div>
              <p className="mt-2 text-xs text-cream-dim">
                Two or more bookings at this hotel
              </p>
            </div>
          </div>

          <Section title="Contact">
            <div className="border border-ink-line bg-ink-soft p-5 text-sm text-cream-dim">
              <div className="text-cream">{contact?.display_name || "—"}</div>
              <div className="mt-2">{contact?.email || "No email"}</div>
              <div className="mt-1">{contact?.phone || "No phone"}</div>
              <p className="mt-4 text-xs text-cream-muted">
                Identity {profile.identity_type}: {profile.identity_key}
              </p>
              <p className="mt-1 text-xs text-cream-muted">
                First seen {formatDateTime(summary?.first_seen_at)} · Last
                activity {formatDateTime(summary?.last_activity_at)}
              </p>
            </div>
          </Section>

          <Section title="Booking / stay history">
            {profile.bookings?.length ? (
              <div className="border border-ink-line bg-ink-soft overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-ink-line text-[10px] tracking-[0.2em] uppercase text-cream-muted">
                      <th className="px-4 py-3 font-normal">Reference</th>
                      <th className="px-4 py-3 font-normal">Stay</th>
                      <th className="px-4 py-3 font-normal">Status</th>
                      <th className="px-4 py-3 font-normal" />
                    </tr>
                  </thead>
                  <tbody>
                    {profile.bookings.map((booking) => (
                      <tr
                        key={booking.id}
                        className="border-t border-ink-line align-top"
                      >
                        <td className="px-4 py-4">
                          <div className="font-mono text-sm text-cream">
                            {booking.booking_number}
                          </div>
                          <div className="mt-1 text-xs text-cream-muted">
                            {booking.guest_name}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-cream-dim">
                          {formatDate(booking.check_in_date)} →{" "}
                          {formatDate(booking.check_out_date)}
                          <div className="mt-1 text-xs text-cream-muted">
                            {booking.room_type_name || "—"}
                            {booking.room_number
                              ? ` · Room ${booking.room_number}`
                              : ""}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={booking.booking_status} />
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/bookings/${booking.id}`}
                            className="text-[11px] tracking-[0.2em] uppercase text-gold hover:text-cream"
                          >
                            View booking
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-cream-muted">
                No bookings for this identity at this hotel.
              </p>
            )}
          </Section>

          <Section title="Inquiry history">
            {profile.inquiries?.length ? (
              <div className="border border-ink-line bg-ink-soft overflow-x-auto">
                <table className="w-full min-w-[720px] text-left">
                  <thead>
                    <tr className="border-b border-ink-line text-[10px] tracking-[0.2em] uppercase text-cream-muted">
                      <th className="px-4 py-3 font-normal">Guest</th>
                      <th className="px-4 py-3 font-normal">Stay intent</th>
                      <th className="px-4 py-3 font-normal">Status</th>
                      <th className="px-4 py-3 font-normal" />
                    </tr>
                  </thead>
                  <tbody>
                    {profile.inquiries.map((inquiry) => (
                      <tr
                        key={inquiry.id}
                        className="border-t border-ink-line align-top"
                      >
                        <td className="px-4 py-4">
                          <div className="text-sm text-cream">
                            {inquiry.guest_name}
                          </div>
                          <div className="mt-1 text-xs text-cream-muted">
                            {formatDateTime(inquiry.created_at)}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-cream-dim">
                          {formatDate(inquiry.check_in_date)} →{" "}
                          {formatDate(inquiry.check_out_date)}
                          <div className="mt-1 text-xs text-cream-muted">
                            {inquiry.room_type_name || "No room type"}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={inquiry.status} />
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/admin/inquiries/${inquiry.id}`}
                            className="text-[11px] tracking-[0.2em] uppercase text-gold hover:text-cream"
                          >
                            View inquiry
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-cream-muted">
                No inquiries for this identity at this hotel.
              </p>
            )}
          </Section>
        </>
      ) : null}
    </div>
  );
}
