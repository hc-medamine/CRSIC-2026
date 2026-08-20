"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import { t, tf } from "@/lib/i18n/labels";
import { IconPlus } from "./cms-icons";
import { PageBreadcrumb, StatusPill } from "./ui-bits";
import { EnStatusBadge } from "./en-status-badge";

export type ContentListRow = {
  id: string;
  href: string;
  title: string;
  status: string;
  enStatus?: string | null;
  updatedAt: Date | string;
  meta?: string;
};

type Props = {
  breadcrumbs: { href?: string; label: string }[];
  title: string;
  subtitle?: string;
  newHref: string;
  newLabel: string;
  emptyLabel: string;
  items: ContentListRow[];
  /** Optional filter toolbar (search form, etc.) */
  toolbar?: ReactNode;
  /** True when `?q=` / `?status=` (or similar) are applied. Distinguishes filtered-empty. */
  filtersActive?: boolean;
  /** Unfiltered list path — used by “Clear filters”. */
  listHref?: string;
};

function formatUpdated(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function NewButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-crs-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-crs-secondary"
    >
      <IconPlus className="h-4 w-4" />
      {label}
    </Link>
  );
}

/** Desk content list: breadcrumb, header card, New CTA, optional toolbar, status table. */
export function ContentListPage({
  breadcrumbs,
  title,
  subtitle,
  newHref,
  newLabel,
  emptyLabel,
  items,
  toolbar,
  filtersActive = false,
  listHref,
}: Props) {
  const lang = useCmsLang();
  const filteredEmpty = items.length === 0 && filtersActive;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <PageBreadcrumb items={breadcrumbs} />
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-crs-border bg-gradient-to-br from-crs-surface via-crs-surface to-crs-accent/10 p-5 shadow-[var(--crs-shadow-soft)] lg:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-crs-ink lg:text-3xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-crs-muted">{subtitle}</p> : null}
        </div>
        <NewButton href={newHref} label={newLabel} />
      </header>

      {toolbar ? (
        <div className="rounded-2xl border border-crs-border bg-crs-surface/90 p-3 shadow-[var(--crs-shadow-soft)]">
          {toolbar}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="cms-empty-state flex flex-col items-start gap-4 rounded-2xl border border-dashed border-crs-border bg-crs-surface p-8 shadow-[var(--crs-shadow-soft)] sm:p-10">
          {filteredEmpty ? (
            <>
              <p className="text-sm text-crs-muted">{t("emptyFiltered", lang)}</p>
              {listHref ? (
                <Link
                  href={listHref}
                  className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 text-sm font-medium text-crs-ink hover:bg-crs-bg"
                >
                  {t("clearFilters", lang)}
                </Link>
              ) : null}
            </>
          ) : (
            <>
              <div>
                <p className="text-sm font-medium text-crs-ink">{emptyLabel}</p>
                <p className="mt-1 text-sm text-crs-muted">{t("emptyCreateHint", lang)}</p>
              </div>
              <NewButton href={newHref} label={newLabel} />
            </>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-crs-border bg-crs-surface shadow-[var(--crs-shadow-soft)]">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead className="border-b border-crs-border bg-crs-bg/80 text-xs uppercase tracking-wide text-crs-muted">
              <tr>
                <th className="px-4 py-3.5 font-semibold">{t("colTitle", lang)}</th>
                <th className="px-4 py-3.5 font-semibold">{t("colStatus", lang)}</th>
                <th className="px-4 py-3.5 font-semibold">{t("colEn", lang)}</th>
                <th className="px-4 py-3.5 font-semibold">{t("colUpdated", lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crs-border/70">
              {items.map((item, i) => (
                <tr
                  key={item.id}
                  className="group relative cms-row-enter border-s-2 border-s-transparent transition-colors hover:border-s-crs-accent hover:bg-crs-accent/5 focus-within:border-s-crs-accent focus-within:bg-crs-accent/5"
                  style={{ "--row-delay": `${Math.min(i, 11) * 45}ms` } as CSSProperties}
                >
                  <td className="px-4 py-3.5">
                    <Link
                      href={item.href}
                      className="font-medium text-crs-ink after:absolute after:inset-0 group-hover:text-crs-primary"
                      dir="auto"
                    >
                      {item.title || t("untitled", lang)}
                    </Link>
                    {item.meta ? (
                      <p className="relative mt-0.5 text-xs text-crs-muted pointer-events-none">{item.meta}</p>
                    ) : null}
                  </td>
                  <td className="relative px-4 py-3.5 pointer-events-none">
                    <StatusPill status={item.status} />
                  </td>
                  <td className="relative px-4 py-3.5 pointer-events-none">
                    <EnStatusBadge status={item.enStatus} />
                  </td>
                  <td className="relative whitespace-nowrap px-4 py-3.5 text-crs-muted pointer-events-none">
                    {formatUpdated(item.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-crs-border/70 px-4 py-3 text-xs text-crs-muted">
            {tf("showingResults", lang, { n: items.length })}
          </div>
        </div>
      )}
    </main>
  );
}

type EditShellProps = {
  breadcrumbs: { href?: string; label: string }[];
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
};

/** Direction B create/edit page shell. */
export function EditPageShell({ breadcrumbs, title, subtitle, children, wide }: EditShellProps) {
  return (
    <main
      className={`mx-auto flex w-full flex-col gap-6 px-6 py-8 font-sans lg:px-10 ${
        wide ? "max-w-4xl" : "max-w-3xl"
      }`}
    >
      <PageBreadcrumb items={breadcrumbs} />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-crs-muted" dir="auto">{subtitle}</p> : null}
      </header>
      {children}
    </main>
  );
}
