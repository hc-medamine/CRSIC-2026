"use client";

import { cmsToast } from "@/app/dashboard/cms-toast";
import { FormEvent, useState } from "react";
import { roleLabel, t, type CmsLang } from "@/lib/i18n/labels";

export type LoginBubble = {
  label: string;
  email: string;
  password: string;
  role: "super_admin" | "reviewer" | "editor";
};

type FormProps = {
  initialLang: CmsLang;
};

type DockProps = {
  bubbles: LoginBubble[];
  lang: CmsLang;
  enabled?: boolean;
};

async function loginWith(
  email: string,
  password: string,
  lang: CmsLang,
): Promise<string | null> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as { ok: boolean; error?: string };
  if (!res.ok || !data.ok) {
    const raw = (data.error ?? "").toLowerCase();
    if (raw.includes("invalid email") || raw.includes("password")) {
      return t("loginInvalidCredentials", lang);
    }
    return data.error ?? t("loginFailed", lang);
  }
  window.location.assign("/dashboard");
  return null;
}

export function LoginForm({ initialLang }: FormProps) {
  const [lang] = useState<CmsLang>(initialLang);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const err = await loginWith(email, password, lang);
      if (err) {
        setError(err);
        cmsToast.error(err);
      }
    } catch {
      setError(t("loginNetworkError", lang));
      cmsToast.error(t("loginNetworkError", lang));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="cms-form flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-crs-ink">{t("loginEmail", lang)}</span>
        <input
          type="email"
          autoComplete="username"
          required
          placeholder={t("loginEmailPh", lang)}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="min-h-12 rounded-xl border border-crs-border bg-crs-surface px-3.5 text-crs-ink"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium text-crs-ink">{t("loginPassword", lang)}</span>
        <input
          type="password"
          autoComplete="current-password"
          required
          placeholder={t("loginPasswordPh", lang)}
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
        {pending ? t("loginSigningIn", lang) : t("loginSignIn", lang)}
      </button>
    </form>
  );
}

const ROLE_PILL: Record<LoginBubble["role"], string> = {
  super_admin:
    "border-emerald-400 bg-emerald-50 text-emerald-950 hover:bg-emerald-100",
  reviewer: "border-sky-400 bg-sky-50 text-sky-950 hover:bg-sky-100",
  editor: "border-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100",
};

const ROLE_DOT: Record<LoginBubble["role"], string> = {
  super_admin: "bg-emerald-500",
  reviewer: "bg-sky-500",
  editor: "bg-amber-500",
};

const LEGEND_ROLES: LoginBubble["role"][] = ["super_admin", "reviewer", "editor"];

/** Dev-only one-click accounts — colour-coded by role, below the sign-in card. */
export function LoginDevBubbles({ bubbles, lang, enabled = false }: DockProps) {
  const [pending, setPending] = useState(false);
  if (!enabled || bubbles.length === 0) return null;

  async function onBubble(b: LoginBubble) {
    setPending(true);
    try {
      const err = await loginWith(b.email, b.password, lang);
      if (err) cmsToast.error(err);
    } catch {
      cmsToast.error(t("loginNetworkError", lang));
    } finally {
      setPending(false);
    }
  }

  return (
    <aside
      className="mt-4 rounded-2xl border border-crs-border bg-crs-surface/90 px-4 py-3 shadow-[var(--crs-shadow-soft)]"
      aria-label={t("loginDevDockAria", lang)}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-crs-ink">{t("loginTestBubbles", lang)}</p>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-crs-muted">
          <span className="font-medium text-crs-ink">{t("loginBubbleLegend", lang)}</span>
          {LEGEND_ROLES.map((role) => (
            <span key={role} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${ROLE_DOT[role]}`} aria-hidden />
              {roleLabel(role, lang)}
            </span>
          ))}
        </p>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {bubbles.map((b) => (
          <button
            key={`${b.role}-${b.email}`}
            type="button"
            disabled={pending}
            onClick={() => void onBubble(b)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium disabled:opacity-60 ${ROLE_PILL[b.role]}`}
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${ROLE_DOT[b.role]}`} aria-hidden />
            {b.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
