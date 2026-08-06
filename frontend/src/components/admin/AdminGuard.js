"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAdminToken, getAdminProfile, clearAdminSession } from "@/lib/adminAuth";
import { BRAND_NAME } from "@/lib/brand";
import Link from "next/link";
import { ToastProvider } from "@/components/admin/Toast";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/hotels", label: "Hotels" },
  { href: "/admin/room-types", label: "Room Types" },
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/tariffs", label: "Tariffs" },
  { href: "/admin/inquiries", label: "Inquiries" },
];

/**
 * Protects admin console routes. Redirects to /admin/login when no JWT.
 */
export default function AdminGuard({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(null);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.replace("/admin/login");
      return;
    }
    setAdmin(getAdminProfile());
    setReady(true);
  }, [router]);

  function handleLogout() {
    clearAdminSession();
    router.replace("/admin/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink">
        <p className="text-xs tracking-[0.3em] uppercase text-cream-muted">
          Loading…
        </p>
      </div>
    );
  }

  const displayName = admin?.full_name || admin?.email || "Admin";

  return (
    <ToastProvider>
    <div className="min-h-screen bg-ink text-cream">
      <header className="border-b border-ink-line bg-ink-soft">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5">
          <div>
            <div className="text-[10px] tracking-[0.35em] uppercase text-gold">
              {BRAND_NAME}
            </div>
            <div className="mt-1 font-display text-xl text-cream">
              Admin Console
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-cream-muted sm:inline">
              {displayName}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center justify-center border border-cream/30 px-5 py-2.5 text-[11px] tracking-[0.22em] uppercase text-cream transition-colors hover:border-gold hover:text-gold"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[220px_1fr]">
        <aside className="border border-ink-line bg-ink-soft p-5">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) =>
              item.href ? (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`px-3 py-2.5 text-xs tracking-[0.2em] uppercase transition-colors ${
                    pathname === item.href ||
                    (item.href !== "/admin/dashboard" &&
                      pathname?.startsWith(item.href))
                      ? "text-gold"
                      : "text-cream-muted hover:text-cream"
                  }`}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  key={item.label}
                  className="px-3 py-2.5 text-xs tracking-[0.2em] uppercase text-cream-muted/50"
                >
                  {item.label}
                </span>
              )
            )}
          </nav>
        </aside>

        <main>{children}</main>
      </div>
    </div>
    </ToastProvider>
  );
}
