"use client";

const STEPS = [
  { id: 1, label: "Stay Details" },
  { id: 2, label: "Available Rooms" },
  { id: 3, label: "Guest Details" },
  { id: 4, label: "Review" },
  { id: 5, label: "Confirmation" },
];

export default function BookingStepper({ currentStep }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ink-line pb-6 text-[11px] tracking-[0.2em] uppercase">
      {STEPS.map((item, index) => (
        <li key={item.id} className="flex items-center gap-3">
          {index > 0 && (
            <span aria-hidden className="text-gold/40">
              ·
            </span>
          )}
          <span
            aria-current={currentStep === item.id ? "step" : undefined}
            className={
              currentStep === item.id
                ? "text-gold"
                : currentStep > item.id
                  ? "text-cream-dim"
                  : "text-cream-muted"
            }
          >
            {item.id}. {item.label}
          </span>
        </li>
      ))}
    </ol>
  );
}

export { STEPS };
