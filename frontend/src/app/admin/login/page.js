"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { adminLogin } from "@/lib/api";
import {
  getAdminToken,
  setAdminSession,
} from "@/lib/adminAuth";
import { BRAND_NAME } from "@/lib/brand";

const INPUT_CLASS =
  "w-full bg-ink border border-ink-line px-4 py-3 text-sm text-cream placeholder:text-cream-muted/60 focus:outline-none focus:border-gold transition-colors";
const LABEL_CLASS =
  "block text-[11px] tracking-[0.25em] uppercase text-cream-muted mb-2";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | error
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (getAdminToken()) {
      router.replace("/admin/dashboard");
    }
  }, [router]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (status === "loading") return;

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter your email and password.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    const result = await adminLogin({
      email: trimmedEmail,
      password,
    });

    if (result.networkError) {
      setErrorMessage(
        "Unable to reach the server. Please check your connection and try again."
      );
      setStatus("error");
      return;
    }

    if (!result.ok) {
      setErrorMessage(
        result.data?.message ||
          "Invalid email or password. Please try again."
      );
      setStatus("error");
      return;
    }

    const payload = result.data?.data;
    const token = payload?.access_token;
    const admin = payload?.admin;

    if (!token) {
      setErrorMessage("Login succeeded but no access token was returned.");
      setStatus("error");
      return;
    }

    setAdminSession(token, admin);
    router.replace("/admin/dashboard");
  }

  const isLoading = status === "loading";

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(215,25,32,0.18), transparent)",
        }}
        aria-hidden
      />

      <div className="relative w-full max-w-md">
        <div className="text-center">
          <span className="text-xs tracking-[0.45em] uppercase text-gold">
            Admin Access
          </span>
          <div className="gold-divider mx-auto mt-5" />
          <h1 className="mt-8 font-display text-4xl leading-tight text-cream sm:text-5xl">
            Sign in to
            <br />
            <span className="italic text-gold">{BRAND_NAME}</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-cream-dim">
            Manage hotels, rooms, and guest inquiries.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-10 border border-ink-line bg-ink-soft p-6 sm:p-8"
          aria-busy={isLoading}
          noValidate
        >
          {status === "error" && errorMessage && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-6 flex gap-3 border border-gold/40 bg-gold/5 p-4 text-sm text-cream-dim"
            >
              <AlertCircle
                className="h-5 w-5 flex-shrink-0 text-gold"
                strokeWidth={1.5}
              />
              <p>{errorMessage}</p>
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="admin-email" className={LABEL_CLASS}>
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLASS}
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="admin-password" className={LABEL_CLASS}>
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT_CLASS}
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 bg-gold px-9 py-4 text-sm tracking-[0.25em] uppercase text-cream transition-colors hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            )}
            {isLoading ? "Signing in…" : "Login"}
          </button>

          <p className="mt-6 text-center text-sm text-cream-muted">
            New operator?{" "}
            <Link
              href="/admin/onboarding"
              className="text-gold transition-colors hover:text-gold-soft"
            >
              Create hotel account
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
