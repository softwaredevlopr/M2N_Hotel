"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getAdminHotel } from "@/lib/adminHotels";
import { clearAdminSession } from "@/lib/adminAuth";
import StatusBadge from "@/components/admin/StatusBadge";

function Row({ label, value }) {
  return (
    <div className="border-t border-ink-line py-4 sm:grid sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-[10px] tracking-[0.22em] uppercase text-cream-muted">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-cream sm:mt-0">{value || "—"}</dd>
    </div>
  );
}

export default function HotelDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await getAdminHotel(id);
      if (cancelled) return;

      if (result.unauthorized) {
        clearAdminSession();
        router.replace("/admin/login");
        return;
      }

      if (!result.ok) {
        setError(result.data?.message || "Hotel not found.");
        setLoading(false);
        return;
      }

      setHotel(result.data?.data || null);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (loading) {
    return (
      <p className="text-sm tracking-[0.2em] uppercase text-cream-muted">
        Loading…
      </p>
    );
  }

  if (error || !hotel) {
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/admin/hotels"
            className="text-[11px] tracking-[0.22em] uppercase text-cream-muted hover:text-gold"
          >
            ← Hotels
          </Link>
          <h1 className="mt-6 font-display text-4xl text-cream">{hotel.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={hotel.status} />
            <span className="text-sm text-cream-dim">{hotel.slug}</span>
          </div>
        </div>
        <Link
          href={`/admin/hotels/${hotel.id}/edit`}
          className="inline-flex items-center justify-center bg-gold px-7 py-3.5 text-xs tracking-[0.25em] uppercase text-cream hover:bg-gold-soft"
        >
          Edit Hotel
        </Link>
      </div>

      <dl className="mt-10 border border-ink-line bg-ink-soft px-6 py-2">
        <Row label="Tagline" value={hotel.tagline} />
        <Row label="Description" value={hotel.description} />
        <Row label="Email" value={hotel.email} />
        <Row label="Phone" value={hotel.phone} />
        <Row label="Website" value={hotel.website_url} />
        <Row label="Address line 1" value={hotel.address_line1} />
        <Row label="Address line 2" value={hotel.address_line2} />
        <Row label="City" value={hotel.city} />
        <Row label="State" value={hotel.state} />
        <Row label="Country" value={hotel.country} />
        <Row label="Postal code" value={hotel.postal_code} />
        <Row label="Timezone" value={hotel.timezone} />
        <Row label="Check-in" value={hotel.check_in_time} />
        <Row label="Check-out" value={hotel.check_out_time} />
        <Row label="Currency" value={hotel.currency_code} />
        <Row label="Star rating" value={hotel.star_rating} />
        <Row
          label="Featured"
          value={hotel.is_featured ? "Yes" : "No"}
        />
        <Row label="Created" value={hotel.created_at} />
        <Row label="Updated" value={hotel.updated_at} />
      </dl>
    </div>
  );
}
