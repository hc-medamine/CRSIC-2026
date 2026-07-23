"use client";

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
      if (err) setError(err);
    } catch {
      setError("Network error");
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
      if (err) setError(err);
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {bubbles.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium text-amber-900">Test only — one-click sign-in</p>
          <p className="mt-0.5 text-[11px] text-amber-800/80">
            Remove or leave gated off before production.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {bubbles.map((b) => (
              <button
                key={b.label}
                type="button"
                disabled={pending}
                onClick={() => void onBubble(b)}
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-60"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Email</span>
          <input
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-zinc-700">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
          />
        </label>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
        >
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </>
  );
}
