import { CloudOff } from "lucide-react";

export default function BackendOfflineBanner() {
  return (
    <div className="bg-gold/15 border-b border-gold/30 text-gold">
      <div className="mx-auto max-w-7xl px-6 lg:px-10 py-3 flex items-center justify-center gap-3 text-[11px] tracking-[0.3em] uppercase">
        <CloudOff className="h-4 w-4" strokeWidth={1.5} />
        Live API unreachable — showing curated preview content
      </div>
    </div>
  );
}
