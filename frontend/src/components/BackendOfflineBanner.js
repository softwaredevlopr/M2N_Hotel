import { CloudOff } from "lucide-react";
import { BRAND_NAME } from "@/lib/brand";

export default function BackendOfflineBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="bg-gold/15 border-b border-gold/30 text-gold"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-3 flex items-center justify-center gap-3 text-[11px] tracking-[0.3em] uppercase">
        <CloudOff className="h-4 w-4" strokeWidth={1.5} />
        Showing {BRAND_NAME} preview content — live details will refresh shortly
      </div>
    </div>
  );
}
