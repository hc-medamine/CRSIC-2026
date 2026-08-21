"use client";

import type { ReactNode } from "react";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import { t, tf } from "@/lib/i18n/labels";
import { PageBreadcrumb } from "./ui-bits";

const DESK_HEADER =
  "flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-crs-border bg-gradient-to-br from-crs-surface via-crs-surface to-crs-accent/10 p-5 shadow-[var(--crs-shadow-soft)] lg:p-6";

export function DeskPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={DESK_HEADER}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-crs-ink lg:text-3xl">{title}</h1>
        {subtitle ? (
          <div className="mt-2 text-sm text-crs-muted" dir="auto">
            {subtitle}
          </div>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function DeskEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="cms-empty-state flex flex-col items-start gap-4 rounded-2xl border border-dashed border-crs-border bg-crs-surface p-8 shadow-[var(--crs-shadow-soft)] sm:p-10">
      {children}
    </div>
  );
}

export function HonestyCount({
  count,
  loadedCount,
  fetchLimit,
}: {
  count: number;
  loadedCount?: number;
  fetchLimit?: number;
}) {
  const lang = useCmsLang();
  const truncated =
    typeof fetchLimit === "number" && (loadedCount ?? count) >= fetchLimit;
  return (
    <div className="border-t border-crs-border/70 px-4 py-3 text-xs text-crs-muted">
      <p>{tf("showingResults", lang, { n: count })}</p>
      {truncated ? <p className="mt-1">{t("listTruncatedHint", lang)}</p> : null}
    </div>
  );
}

export function AdminPageShell({
  breadcrumbs,
  title,
  subtitle,
  children,
  wide = true,
  actions,
}: {
  breadcrumbs: { href?: string; label: string }[];
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  wide?: boolean;
  actions?: ReactNode;
}) {
  return (
    <main
      className={`mx-auto flex w-full flex-col gap-6 px-6 py-8 font-sans lg:px-10 ${
        wide ? "max-w-6xl" : "max-w-3xl"
      }`}
    >
      <PageBreadcrumb items={breadcrumbs} />
      <DeskPageHeader title={title} subtitle={subtitle} actions={actions} />
      {children}
    </main>
  );
}
