"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type, message) => {
      const id = ++toastId;
      setToasts((prev) => [...prev, { id, type, message }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss]
  );

  const api = useMemo(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-6 right-6 z-[100] flex w-[min(100%-2rem,22rem)] flex-col gap-3"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.type === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex items-start gap-3 border px-4 py-3 shadow-lg ${
              toast.type === "success"
                ? "border-gold/40 bg-ink-soft text-cream"
                : "border-gold bg-ink text-cream"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                strokeWidth={1.5}
              />
            ) : (
              <AlertCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-gold"
                strokeWidth={1.5}
              />
            )}
            <p className="flex-1 text-sm leading-relaxed text-cream-dim">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-cream-muted transition-colors hover:text-cream"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      success: () => {},
      error: () => {},
    };
  }
  return ctx;
}
