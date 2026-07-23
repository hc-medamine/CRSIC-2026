import Link from "next/link";
import type { ReactNode } from "react";
import type { QueueItem } from "@/lib/content/queues";
import { IconChevron } from "./cms-icons";

export function relativeShort(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.floor(ms / 60000));
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d`;
  return new Date(iso).toISOString().slice(0, 10);
}

export function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  let tone = "bg-crs-bg text-crs-muted";
  if (s === "published") tone = "bg-crs-primary/10 text-crs-primary";
  else if (s === "submitted") tone = "bg-amber-100 text-amber-900";
  else if (s === "draft") tone = "bg-crs-bg text-crs-ink/70";
  else if (s === "changes_requested") tone = "bg-orange-100 text-orange-900";
  else if (s === "rejected") tone = "bg-red-100 text-red-800";
  else if (s === "unpublished") tone = "bg-crs-bg text-crs-muted";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tone}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function QueueCard({
  title,
  hint,
  icon,
  items,
  emptyLabel,
  footerHref,
  footerLabel,
  showAuthor,
  authorPrefix,
}: {
  title: string;
  hint: string;
  icon: ReactNode;
  items: QueueItem[];
  emptyLabel: string;
  footerHref?: string;
  footerLabel?: string;
  showAuthor?: boolean;
  authorPrefix?: string;
}) {
  const visible = items.slice(0, 5);
  return (
    <section className="flex flex-col rounded-2xl border border-crs-border bg-crs-surface shadow-[0_1px_3px_rgba(26,46,38,0.06)]">
      <div className="flex items-start gap-3 border-b border-crs-border/70 px-4 py-4">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-crs-primary/10 text-crs-primary">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-crs-ink">{title}</h2>
            <span className="rounded-full bg-crs-primary/10 px-2 py-0.5 text-[11px] font-semibold text-crs-primary">
              {items.length}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-crs-muted">{hint}</p>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="px-4 py-6 text-sm text-crs-muted">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-crs-border/60">
          {visible.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-crs-bg/80"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-crs-ink" dir="auto">
                    {item.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-crs-muted">
                    {showAuthor && item.authorName
                      ? `${authorPrefix ?? ""} ${item.authorName}`.trim()
                      : item.status.replace(/_/g, " ")}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-crs-muted">{relativeShort(item.updatedAt)}</span>
                <IconChevron className="h-4 w-4 shrink-0 text-crs-muted opacity-0 transition group-hover:opacity-100" />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {footerHref && footerLabel ? (
        <div className="border-t border-crs-border/70 px-4 py-3">
          <Link
            href={footerHref}
            className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-crs-primary hover:underline"
          >
            {footerLabel}
            <IconChevron className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export function PageBreadcrumb({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-crs-muted">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="inline-flex items-center gap-2">
          {i > 0 ? <span aria-hidden>/</span> : null}
          {item.href ? (
            <Link href={item.href} className="min-h-8 inline-flex items-center text-crs-primary hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-crs-ink">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
