"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdminProfile } from "@/lib/adminAuth";

export default function AdminDashboardPage() {
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    setAdmin(getAdminProfile());
  }, []);

  const name = admin?.full_name || "Admin";

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
        You are signed in to the M2N Hotels admin console. Manage hotels, rooms,
        and media below; inquiries screens are coming next.
      </p>

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
