"use client";

import Link from "next/link";
import type { ReactNode } from "react";

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
    <section className="flex flex-col gap-3 rounded-2xl border border-crs-border/80 bg-crs-bg/30 p-4 first:mt-0">
      <div className="flex items-start gap-3">
        {typeof step === "number" ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-crs-primary text-xs font-semibold text-white">
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
    <details className="rounded-2xl border border-crs-border bg-crs-bg/60 open:bg-crs-surface">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-crs-ink marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex min-h-11 items-center gap-3">
          {typeof step === "number" ? (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-crs-primary text-xs font-semibold text-white">
              {step}
            </span>
          ) : null}
          <span className="flex flex-col gap-0.5">
            <span>{title}</span>
            {hint ? <span className="text-xs font-normal text-crs-muted">{hint}</span> : null}
          </span>
        </span>
      </summary>
      <div className="grid gap-3 border-t border-crs-border/80 px-4 py-4">{children}</div>
    </details>
  );
}

/** Sticky bottom action bar (Save / Submit) — Direction B edit mockup. */
export function FormStickyActions({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 mt-6 border-t border-crs-border bg-crs-surface/95 py-4 backdrop-blur">
      <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
    </div>
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
    <div className={`rounded-2xl border px-4 py-3 text-sm ${styles}`} role="status">
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
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-crs-muted">
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
