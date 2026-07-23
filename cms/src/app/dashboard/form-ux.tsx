"use client";

import Link from "next/link";
import type { ReactNode } from "react";

/** Visual section inside a content form (one job per block). */
export function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {hint ? <p className="mt-0.5 text-xs text-zinc-500">{hint}</p> : null}
      </div>
      <div className="grid gap-3">{children}</div>
    </section>
  );
}

/** Collapsed EN / SEO / advanced fields. */
export function AdvancedDisclosure({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="rounded-lg border border-zinc-200 bg-zinc-50/80 open:bg-white">
      <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-zinc-800 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="flex flex-col gap-0.5">
          <span>{title}</span>
          {hint ? <span className="text-xs font-normal text-zinc-500">{hint}</span> : null}
        </span>
      </summary>
      <div className="grid gap-3 border-t border-zinc-100 px-4 py-4">{children}</div>
    </details>
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
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-zinc-200 bg-zinc-50 text-zinc-700";
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles}`} role="status">
      {children}
    </div>
  );
}

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
    <div className="flex flex-wrap gap-3 text-sm">
      <Link href="/dashboard" className="underline">
        {homeLabel}
      </Link>
      <Link href={listHref} className="underline text-zinc-600">
        {listLabel}
      </Link>
    </div>
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
