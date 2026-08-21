"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { t } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

/** Visual section inside a content form (one job per block). */
export function FormSection({
  title,
  hint,
  step,
  children,
}: {
  title: string;
  hint?: string;
  step?: number;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-[var(--crs-shadow-soft)] first:mt-0 lg:p-6">
      <div className="flex items-start gap-3">
        {typeof step === "number" ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crs-primary text-xs font-semibold text-white">
            {step}
          </span>
        ) : null}
        <div>
          <h2 className="text-sm font-semibold text-crs-ink">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs text-crs-muted">{hint}</p> : null}
        </div>
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

/** Collapsed EN / SEO / advanced fields. */
export function AdvancedDisclosure({
  title,
  hint,
  step,
  children,
}: {
  title: string;
  hint?: string;
  step?: number;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="rounded-2xl border border-crs-border bg-crs-surface shadow-[var(--crs-shadow-soft)] open:bg-crs-surface">
      <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-crs-ink marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-h-11 items-center gap-3">
          {typeof step === "number" ? (
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-crs-primary text-xs font-semibold text-white">
              {step}
            </span>
          ) : null}
          <span className="flex flex-col gap-0.5">
            <span>{title}</span>
            {hint ? <span className="text-xs font-normal text-crs-muted">{hint}</span> : null}
          </span>
        </span>
      </summary>
      <div className="grid gap-3 border-t border-crs-border/80 px-5 py-5">{children}</div>
    </details>
  );
}

/** Sticky bottom action bar (Save / Submit) — Direction B edit mockup. */
export function FormStickyActions({ children }: { children: ReactNode }) {
  const [castShadow, setCastShadow] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    const sentinel = sentinelRef.current;
    if (!bar || !sentinel) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const barTop = bar.getBoundingClientRect().top;
      const sentinelBottom = sentinel.getBoundingClientRect().bottom;
      setCastShadow(sentinelBottom > barTop + 4);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={sentinelRef} className="h-px" aria-hidden="true" />
      <div
        ref={barRef}
        className={`sticky bottom-0 z-10 mt-6 rounded-2xl border border-crs-border bg-crs-surface/95 px-4 py-4 backdrop-blur transition-[box-shadow] duration-200 ${
          castShadow ? "shadow-[var(--crs-shadow-lift)]" : "shadow-[var(--crs-shadow-soft)]"
        }`}
      >
        <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
      </div>
    </>
  );
}

export function FormBanner({
  kind,
  children,
}: {
  kind: "error" | "success" | "info";
  children: ReactNode;
}) {
  const styles =
    kind === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : kind === "success"
        ? "border-crs-secondary/30 bg-crs-primary/10 text-crs-primary"
        : "border-crs-border bg-crs-bg text-crs-ink";
  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm shadow-[var(--crs-shadow-soft)] ${styles}`} role="status">
      {children}
    </div>
  );
}

/** Breadcrumb-style nav: Home / List (or custom trail). */
export function CmsBackLinks({
  listHref,
  homeLabel,
  listLabel,
}: {
  listHref: string;
  homeLabel: string;
  listLabel: string;
}) {
  const lang = useCmsLang();
  return (
    <nav aria-label={t("breadcrumb", lang)} className="flex flex-wrap items-center gap-2 text-sm text-crs-muted">
      <Link href="/dashboard" className="min-h-11 inline-flex items-center text-crs-primary hover:underline">
        {homeLabel}
      </Link>
      <span aria-hidden>/</span>
      <Link href={listHref} className="min-h-11 inline-flex items-center text-crs-ink hover:underline">
        {listLabel}
      </Link>
    </nav>
  );
}

/** Map workflow action to a friendly next-step message key. */
export function messageForAction(action: string): string | null {
  switch (action) {
    case "submit":
      return "submittedNext";
    case "approve":
      return "approvedNext";
    case "publish":
      return "publishedNext";
    case "save":
    case "update":
      return "savedStay";
    default:
      return "savedStay";
  }
}

/** Publish button state machine: idle → spinner → gold checkmark pop. */
export function PublishButton({
  pending,
  onClick,
  children,
  className = "w-fit rounded-xl bg-crs-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-crs-secondary disabled:opacity-60",
  disabled = false,
}: {
  pending: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "pending" | "done">("idle");
  const [prevPending, setPrevPending] = useState(pending);

  if (pending !== prevPending) {
    setPrevPending(pending);
    if (pending) {
      setPhase("pending");
    } else if (phase === "pending") {
      setPhase("done");
    }
  }

  useEffect(() => {
    if (phase !== "done") return;
    const id = setTimeout(() => setPhase("idle"), 1600);
    return () => clearTimeout(id);
  }, [phase]);

  return (
    <button
      type="button"
      disabled={pending || disabled}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-center gap-2 ${className}`}
      aria-live="polite"
    >
      {phase === "pending" ? (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
          aria-hidden
        />
      ) : null}
      {phase === "done" ? (
        <span className="cms-check-pop text-crs-accent" aria-hidden>
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path d="m5 13 4.5 4.5L19 8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      ) : null}
      <span>{children}</span>
    </button>
  );
}
