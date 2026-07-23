import Link from "next/link";
import type { ReactNode } from "react";
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
};

function formatUpdated(value: Date | string): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toISOString().slice(0, 16).replace("T", " ");
}

/** Direction B content list: breadcrumb, title, New CTA, optional toolbar, status table. */
export function ContentListPage({
  breadcrumbs,
  title,
  subtitle,
  newHref,
  newLabel,
  emptyLabel,
  items,
  toolbar,
}: Props) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <PageBreadcrumb items={breadcrumbs} />
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-crs-muted">{subtitle}</p> : null}
        </div>
        <Link
          href={newHref}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-crs-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-crs-secondary"
        >
          <IconPlus className="h-4 w-4" />
          {newLabel}
        </Link>
      </header>

      {toolbar}

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-crs-border bg-crs-surface p-8 text-sm text-crs-muted">
          {emptyLabel}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-crs-border bg-crs-surface shadow-[0_1px_3px_rgba(26,46,38,0.06)]">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-crs-border bg-crs-bg/80 text-xs uppercase tracking-wide text-crs-muted">
              <tr>
                <th className="px-4 py-3 font-semibold">Title</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">EN</th>
                <th className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crs-border/70">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-crs-bg/50">
                  <td className="px-4 py-3">
                    <Link
                      href={item.href}
                      className="font-medium text-crs-ink hover:text-crs-primary hover:underline"
                      dir="auto"
                    >
                      {item.title || "(untitled)"}
                    </Link>
                    {item.meta ? (
                      <p className="mt-0.5 text-xs text-crs-muted">{item.meta}</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={item.status} />
                  </td>
                  <td className="px-4 py-3">
                    <EnStatusBadge status={item.enStatus} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-crs-muted">
                    {formatUpdated(item.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-crs-border/70 px-4 py-3 text-xs text-crs-muted">
            Showing {items.length} result{items.length === 1 ? "" : "s"}
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
        {subtitle ? <p className="mt-1 text-sm text-crs-muted">{subtitle}</p> : null}
      </header>
      {children}
    </main>
  );
}
