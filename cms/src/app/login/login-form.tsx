"use client";

import { cmsToast } from "@/app/dashboard/cms-toast";
import { FormEvent, useState } from "react";

export type LoginBubble = {
  label: string;
  email: string;
  password: string;
};

type Props = {
  bubbles: LoginBubble[];
};

async function loginWith(email: string, password: string): Promise<string | null> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!res.ok || !data.ok) {
    return data.error ?? "Login failed";
  }
  window.location.assign("/dashboard");
  return null;
}

export function LoginForm({ bubbles }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const err = await loginWith(email, password);
      if (err) {
        setError(err);
        cmsToast.error(err);
      }
    } catch {
      setError("Network error");
      cmsToast.error("Network error");
    } finally {
      setPending(false);
    }
  }

  async function onBubble(b: LoginBubble) {
    setEmail(b.email);
    setPassword(b.password);
    setError(null);
    setPending(true);
    try {
      const err = await loginWith(b.email, b.password);
      if (err) {
        setError(err);
        cmsToast.error(err);
      }
    } catch {
      setError("Network error");
      cmsToast.error("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {bubbles.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium text-amber-900">Test only — one-click sign-in</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {bubbles.map((b) => (
              <button
                key={b.label}
                type="button"
                disabled={pending}
                onClick={() => void onBubble(b)}
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-60"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="cms-form flex flex-col gap-4">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-crs-ink">Email address</span>
          <input
            type="email"
            autoComplete="username"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-12 rounded-xl border border-crs-border bg-crs-surface px-3.5 text-crs-ink"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-crs-ink">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-12 rounded-xl border border-crs-border bg-crs-surface px-3.5 text-crs-ink"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 min-h-12 w-full rounded-xl bg-crs-primary text-sm font-semibold text-white hover:bg-crs-secondary disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
