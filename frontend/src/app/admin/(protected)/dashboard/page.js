"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAdminProfile, clearAdminSession } from "@/lib/adminAuth";
import {
  BOOKING_STATUSES,
  formatApiError,
  getAdminBookingStats,
} from "@/lib/adminBookings";
import StatusBadge from "@/components/admin/StatusBadge";
import { useToast } from "@/components/admin/Toast";

function StatCard({ label, value, hint }) {
  return (
    <div className="border border-ink-line bg-ink-soft p-5">
      <div className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
        {label}
      </div>
      <div className="mt-3 font-display text-3xl text-gold">{value}</div>
      {hint ? (
        <p className="mt-2 text-xs leading-relaxed text-cream-dim">{hint}</p>
      ) : null}
    </div>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const toast = useToast();
  const [admin, setAdmin] = useState(null);
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    setAdmin(getAdminProfile());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoadingStats(true);
      const result = await getAdminBookingStats();
      if (cancelled) return;

      if (result.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (!result.ok) {
        toast.error(formatApiError(result, "Unable to load booking stats."));
        setStats(null);
        setLoadingStats(false);
        return;
      }

      setStats(result.data?.data || null);
      setLoadingStats(false);
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, [router, toast]);

  const name = admin?.full_name || "Admin";
  const occupancy = stats?.occupancy;

  return (
    <div>
      <span className="text-xs tracking-[0.45em] uppercase text-gold">
        Dashboard
      </span>
      <div className="gold-divider mt-5" />
      <h1 className="mt-8 font-display text-4xl leading-tight text-cream sm:text-5xl">
        Welcome {name}
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-cream-dim">
        Operations overview for M2N Hotels. Manage bookings, properties, rooms,
        media, and tariffs from the console.
      </p>

      <div className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-[11px] tracking-[0.25em] uppercase text-gold">
            Booking statistics
          </h2>
          <Link
            href="/admin/bookings"
            className="text-[11px] tracking-[0.2em] uppercase text-cream-muted hover:text-gold"
          >
            View all bookings →
          </Link>
        </div>

        {loadingStats ? (
          <p className="mt-6 inline-flex items-center gap-2 text-sm text-cream-muted">
            <Loader2 className="h-4 w-4 animate-spin text-gold" strokeWidth={2} />
            Loading stats…
          </p>
        ) : stats ? (
          <>
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Today's arrivals"
                value={stats.arrivals_today}
                hint={`Check-in ${stats.today}`}
              />
              <StatCard
                label="Today's departures"
                value={stats.departures_today}
                hint={`Check-out ${stats.today}`}
              />
              <StatCard
                label="Upcoming bookings"
                value={stats.upcoming}
                hint="Pending or confirmed, future check-in"
              />
              <StatCard
                label="Occupancy tonight"
                value={`${occupancy?.occupancy_pct ?? 0}%`}
                hint={`${occupancy?.rooms_held_tonight ?? 0} of ${
                  occupancy?.sellable_rooms ?? 0
                } sellable rooms held · ${
                  occupancy?.in_house_bookings ?? 0
                } in-house bookings`}
              />
            </div>

            <div className="mt-6 border border-ink-line bg-ink-soft p-5">
              <h3 className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
                Bookings by status
              </h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {BOOKING_STATUSES.map((status) => (
                  <Link
                    key={status}
                    href={`/admin/bookings?status=${encodeURIComponent(status)}`}
                    className="inline-flex items-center gap-2 border border-ink-line bg-ink px-3 py-2 transition-colors hover:border-gold/50"
                  >
                    <StatusBadge status={status} />
                    <span className="font-display text-lg text-cream">
                      {stats.by_status?.[status] ?? 0}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : (
          <p className="mt-6 text-sm text-cream-muted">
            Booking stats are unavailable right now.
          </p>
        )}
      </div>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/bookings"
          className="border border-ink-line bg-ink-soft p-6 transition-colors hover:border-gold/50"
        >
          <h2 className="font-display text-2xl text-cream">Bookings</h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            Search, filter, confirm, and manage guest reservations.
          </p>
        </Link>
        <Link
          href="/admin/hotels"
          className="border border-ink-line bg-ink-soft p-6 transition-colors hover:border-gold/50"
        >
          <h2 className="font-display text-2xl text-cream">Hotels</h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            List, search, add, edit, and delete properties.
          </p>
        </Link>
        <Link
          href="/admin/room-types"
          className="border border-ink-line bg-ink-soft p-6 transition-colors hover:border-gold/50"
        >
          <h2 className="font-display text-2xl text-cream">Room Types</h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            Manage room types per hotel.
          </p>
        </Link>
        <Link
          href="/admin/rooms"
          className="border border-ink-line bg-ink-soft p-6 transition-colors hover:border-gold/50"
        >
          <h2 className="font-display text-2xl text-cream">Rooms</h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            Physical inventory per property.
          </p>
        </Link>
        <Link
          href="/admin/media"
          className="border border-ink-line bg-ink-soft p-6 transition-colors hover:border-gold/50"
        >
          <h2 className="font-display text-2xl text-cream">Media</h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            Upload and organize hotel images.
          </p>
        </Link>
        <Link
          href="/admin/tariffs"
          className="border border-ink-line bg-ink-soft p-6 transition-colors hover:border-gold/50"
        >
          <h2 className="font-display text-2xl text-cream">Tariffs</h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            Manage meal-plan rates, occupancy pricing, and seasonal windows.
          </p>
        </Link>
        <div className="border border-ink-line bg-ink-soft p-6 opacity-60">
          <h2 className="font-display text-2xl text-cream">Inquiries</h2>
          <p className="mt-3 text-sm leading-relaxed text-cream-dim">
            Guest booking inquiries — coming soon.
          </p>
        </div>
      </div>
    </div>
  );
}
