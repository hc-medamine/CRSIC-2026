"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import { t, tf } from "@/lib/i18n/labels";
import {
  contentListSortKind,
  sortRows,
  toggleHeaderSort,
  type ContentListSortKey,
  type HeaderSort,
  type SortKind,
} from "@/lib/content/headerSort";
import { IconPlus, IconChevron } from "./cms-icons";
import { SortableTh } from "./sortable-th";
import { DeskEmptyState, DeskPageHeader } from "./desk-ui";
import { PageBreadcrumb, StatusPill } from "./ui-bits";
import { EnStatusBadge } from "./en-status-badge";
import {
  ContentListBulkBar,
  ContentListBulkModal,
  DeskListCheckbox,
  postNewsBulk,
  toastBulkNetworkError,
  type BulkAction,
  type BulkDialog,
  type ContentListBulk,
} from "./content-list-bulk";
import { CloneDialogs, CloneItemButton, postClone, postCloneUndo, type CloneResult } from "./clone-ui";

export type ContentListRow = {
  id: string;
  href: string;
  title: string;
  status: string;
  enStatus?: string | null;
  updatedAt: Date | string;
  meta?: string;
};

/** Opt-in Load more (news / events / publications only). */
export type ContentListLoadMore = {
  apiPath: "/api/news" | "/api/events" | "/api/publications";
  itemHrefBase: "/dashboard/news" | "/dashboard/events" | "/dashboard/publications";
  page: number;
  hasMore: boolean;
  q: string;
  status: string;
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
  loadMore?: ContentListLoadMore;
  /** Opt-in list bulk (Editor Recycle / Reviewer Unpublish / SA both). */
  bulk?: ContentListBulk;
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

function mapApiItem(
  item: {
    id: string;
    title_ar?: string | null;
    status: string;
    en_status?: string | null;
    updated_at: string;
  },
  hrefBase: ContentListLoadMore["itemHrefBase"],
  untitled: string,
): ContentListRow {
  return {
    id: item.id,
    href: `${hrefBase}/${item.id}`,
    title: item.title_ar || untitled,
    status: item.status,
    enStatus: item.en_status,
    updatedAt: item.updated_at,
  };
}

function replaceListPageInUrl(page: number, q: string, status: string) {
  const url = new URL(window.location.href);
  if (page <= 1) url.searchParams.delete("page");
  else url.searchParams.set("page", String(page));
  if (q) url.searchParams.set("q", q);
  else url.searchParams.delete("q");
  if (status) url.searchParams.set("status", status);
  else url.searchParams.delete("status");
  const next = `${url.pathname}${url.search}`;
  window.history.replaceState(null, "", next);
}

const SKELETON_ROWS = 4;

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
  loadMore,
  bulk,
}: Props) {
  const lang = useCmsLang();
  const filterKey = `${loadMore?.q ?? ""}|${loadMore?.status ?? ""}`;
  const [rows, setRows] = useState(items);
  const [page, setPage] = useState(loadMore?.page ?? 1);
  const [hasMore, setHasMore] = useState(Boolean(loadMore?.hasMore));
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkDialog, setBulkDialog] = useState<BulkDialog | null>(null);
  const [cloneBusy, setCloneBusy] = useState(false);
  const [cloneDialog, setCloneDialog] = useState<
    { kind: "confirm"; sourceId: string } | { kind: "result"; clone: CloneResult } | null
  >(null);
  const [sort, setSort] = useState<HeaderSort | null>(null);
  const [seenFilterKey, setSeenFilterKey] = useState(filterKey);
  const [seenItems, setSeenItems] = useState(items);
  const fetchGen = useRef(0);

  const filteredEmpty = rows.length === 0 && filtersActive;
  const selectedCount = selected.size;
  const allLoadedSelected = rows.length > 0 && selectedCount === rows.length;
  const someLoadedSelected = selectedCount > 0 && selectedCount < rows.length;
  const publishedSelected = rows.filter((r) => selected.has(r.id) && r.status === "published").length;

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleLoaded(checked: boolean) {
    setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set());
  }

  if (seenFilterKey !== filterKey) {
    setSeenFilterKey(filterKey);
    if (loadMore && sort) {
      setLoadingMore(true);
      setLoadError(false);
    } else {
      setRows(items);
      setPage(loadMore?.page ?? 1);
      setHasMore(Boolean(loadMore?.hasMore));
    }
  }
  if (!loadMore && items !== seenItems) {
    setSeenItems(items);
    setRows(items);
  }

  const visibleRows = useMemo(() => {
    return sortRows(
      rows,
      sort,
      (row, key) => {
        if (key === "status") return row.status;
        if (key === "en") return row.enStatus ?? "";
        if (key === "updated") {
          return typeof row.updatedAt === "string" ? row.updatedAt : row.updatedAt.toISOString();
        }
        return row.title;
      },
      (key) => contentListSortKind(key as ContentListSortKey),
      lang,
    );
  }, [rows, sort, lang]);

  async function fetchListPage(nextPage: number, nextSort: HeaderSort | null) {
    if (!loadMore) return null;
    const sp = new URLSearchParams();
    sp.set("page", String(nextPage));
    if (loadMore.q) sp.set("q", loadMore.q);
    if (loadMore.status) sp.set("status", loadMore.status);
    if (nextSort) {
      sp.set("sort", nextSort.key);
      sp.set("dir", nextSort.dir);
    }
    const res = await fetch(`${loadMore.apiPath}?${sp.toString()}`);
    const data = (await res.json()) as {
      ok?: boolean;
      items?: Array<{
        id: string;
        title_ar?: string | null;
        status: string;
        en_status?: string | null;
        updated_at: string;
      }>;
      hasMore?: boolean;
      page?: number;
    };
    if (!res.ok || !data.ok || !Array.isArray(data.items)) return null;
    const untitled = t("untitled", lang);
    return {
      extra: data.items.map((item) => mapApiItem(item, loadMore.itemHrefBase, untitled)),
      hasMore: Boolean(data.hasMore),
      page: typeof data.page === "number" ? data.page : nextPage,
    };
  }

  function onToggleSort(key: string, kind: SortKind) {
    const next = toggleHeaderSort(sort, key, kind);
    if (!loadMore) {
      setSort(next);
      return;
    }
    setLoadingMore(true);
    setLoadError(false);
    const gen = ++fetchGen.current;
    void fetchListPage(1, next)
      .then((result) => {
        if (gen !== fetchGen.current) return;
        if (!result) {
          setLoadError(true);
          return;
        }
        setSort(next);
        setRows(result.extra);
        setPage(1);
        setHasMore(result.hasMore);
        replaceListPageInUrl(1, loadMore.q, loadMore.status);
      })
      .catch(() => {
        if (gen !== fetchGen.current) return;
        setLoadError(true);
      })
      .finally(() => {
        if (gen === fetchGen.current) setLoadingMore(false);
      });
  }

  useEffect(() => {
    fetchGen.current += 1;
    if (!loadMore || !sort) return;
    const gen = fetchGen.current;
    void fetchListPage(1, sort)
      .then((result) => {
        if (gen !== fetchGen.current) return;
        if (!result) {
          setLoadError(true);
          setLoadingMore(false);
          return;
        }
        setRows(result.extra);
        setPage(1);
        setHasMore(result.hasMore);
        replaceListPageInUrl(1, loadMore.q, loadMore.status);
        setLoadingMore(false);
      })
      .catch(() => {
        if (gen !== fetchGen.current) return;
        setLoadError(true);
        setLoadingMore(false);
      });
    // Page-1 refetch when the filter changes while sort is already on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  function listHrefBase(): string {
    if (loadMore) return loadMore.itemHrefBase;
    const sample = rows[0]?.href ?? items[0]?.href ?? "";
    return sample.replace(/\/[^/]+$/, "");
  }

  function prependCloneRow(clone: { id: string; title: string; href?: string }) {
    const href = clone.href ?? `${listHrefBase()}/${clone.id}`;
    setRows((prev) => {
      if (prev.some((r) => r.id === clone.id)) return prev;
      return [
        {
          id: clone.id,
          href,
          title: clone.title,
          status: "draft",
          updatedAt: new Date(),
        },
        ...prev,
      ];
    });
  }

  function removeCloneRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function applyBulkToRows(action: BulkAction, doneIds: Set<string>) {
    const publishedFilter = loadMore?.status === "published";
    setRows((prev) => {
      if (action === "recycle") return prev.filter((r) => !doneIds.has(r.id));
      return prev
        .map((r) => (doneIds.has(r.id) ? { ...r, status: "draft" } : r))
        .filter((r) => !(publishedFilter && doneIds.has(r.id)));
    });
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of doneIds) next.delete(id);
      return next;
    });
  }

  async function onLoadMore() {
    if (!loadMore || loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadError(false);
    const nextPage = page + 1;
    try {
      const result = await fetchListPage(nextPage, sort);
      if (!result) {
        setLoadError(true);
        return;
      }
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        return [...prev, ...result.extra.filter((item) => !seen.has(item.id))];
      });
      setPage(result.page);
      setHasMore(result.hasMore);
      replaceListPageInUrl(result.page, loadMore.q, loadMore.status);
    } catch {
      setLoadError(true);
    } finally {
      setLoadingMore(false);
    }
  }

  async function onConfirmBulk() {
    if (!bulk || !bulkDialog || bulkDialog.kind !== "confirm") return;
    const action = bulkDialog.action;
    const ids = rows.filter((r) => selected.has(r.id)).map((r) => r.id);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const result = await postNewsBulk(bulk.apiPath, action, ids, t("actionFailed", lang));
      if (action === "clone") {
        for (const row of result.done) prependCloneRow(row);
        setSelected(new Set());
      } else {
        applyBulkToRows(action, new Set(result.done.map((d) => d.id)));
      }
      setBulkDialog({ kind: "report", action, done: result.done, skipped: result.skipped });
    } catch (err) {
      toastBulkNetworkError(err instanceof Error ? err.message : t("actionFailed", lang));
    } finally {
      setBulkBusy(false);
    }
  }

  async function onConfirmRowClone() {
    if (!cloneDialog || cloneDialog.kind !== "confirm") return;
    setCloneBusy(true);
    try {
      const clone = await postClone(cloneDialog.sourceId, t("actionFailed", lang));
      prependCloneRow(clone);
      setCloneDialog({ kind: "result", clone });
    } catch (err) {
      toastBulkNetworkError(err instanceof Error ? err.message : t("actionFailed", lang));
      setCloneDialog(null);
    } finally {
      setCloneBusy(false);
    }
  }

  async function onUndoRowClone() {
    if (!cloneDialog || cloneDialog.kind !== "result") return;
    setCloneBusy(true);
    try {
      await postCloneUndo(cloneDialog.clone.id, t("actionFailed", lang));
      removeCloneRow(cloneDialog.clone.id);
      setCloneDialog(null);
    } catch (err) {
      toastBulkNetworkError(err instanceof Error ? err.message : t("actionFailed", lang));
    } finally {
      setCloneBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <PageBreadcrumb items={breadcrumbs} />
      <DeskPageHeader
        title={title}
        subtitle={subtitle}
        actions={<NewButton href={newHref} label={newLabel} />}
      />

      {toolbar ? (
        <div className="rounded-2xl border border-crs-border bg-crs-surface/90 p-3 shadow-[var(--crs-shadow-soft)]">
          {toolbar}
        </div>
      ) : null}

      {rows.length === 0 ? (
        <DeskEmptyState>
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
        </DeskEmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-crs-border bg-crs-surface shadow-[var(--crs-shadow-soft)]">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead className="border-b border-crs-border bg-crs-bg/80 text-xs uppercase tracking-wide text-crs-muted">
              <tr>
                {bulk ? (
                  <th className="w-12 px-2 py-3.5">
                    <DeskListCheckbox
                      checked={allLoadedSelected}
                      indeterminate={someLoadedSelected}
                      onChange={toggleLoaded}
                      label={t("bulkSelectLoaded", lang)}
                    />
                  </th>
                ) : null}
                <SortableTh
                  label={t("colTitle", lang)}
                  sortKey="title"
                  kind="text"
                  sort={sort}
                  lang={lang}
                  onToggle={onToggleSort}
                />
                <SortableTh
                  label={t("colStatus", lang)}
                  sortKey="status"
                  kind="status"
                  sort={sort}
                  lang={lang}
                  onToggle={onToggleSort}
                />
                <SortableTh
                  label={t("colEn", lang)}
                  sortKey="en"
                  kind="enStatus"
                  sort={sort}
                  lang={lang}
                  onToggle={onToggleSort}
                />
                <SortableTh
                  label={t("colUpdated", lang)}
                  sortKey="updated"
                  kind="date"
                  sort={sort}
                  lang={lang}
                  onToggle={onToggleSort}
                />
                <th className="px-4 py-3.5 font-semibold">{t("colActions", lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crs-border/70">
              {visibleRows.map((item, i) => (
                <tr
                  key={item.id}
                  className="group relative cms-row-enter border-s-2 border-s-transparent transition-colors hover:border-s-crs-accent hover:bg-crs-accent/5 focus-within:border-s-crs-accent focus-within:bg-crs-accent/5"
                  style={{ "--row-delay": `${Math.min(i, 11) * 45}ms` } as CSSProperties}
                >
                  {bulk ? (
                    <td className="relative z-10 w-12 px-2 py-3.5">
                      <DeskListCheckbox
                        checked={selected.has(item.id)}
                        onChange={(checked) => toggleOne(item.id, checked)}
                        label={`${t("bulkSelectRow", lang)}: ${item.title || t("untitled", lang)}`}
                      />
                    </td>
                  ) : null}
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
                  <td className="relative z-10 px-4 py-3.5">
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-3 py-1.5 text-xs font-medium text-crs-ink hover:bg-crs-bg"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCloneDialog({ kind: "confirm", sourceId: item.id });
                      }}
                    >
                      {t("actionDuplicate", lang)}
                    </button>
                  </td>
                </tr>
              ))}
              {loadingMore
                ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                    <tr key={`sk-${i}`} aria-hidden className="border-s-2 border-s-transparent">
                      {bulk ? <td className="px-2 py-3.5" /> : null}
                      <td className="px-4 py-3.5">
                        <div className="cms-skeleton h-4 w-2/5" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="cms-skeleton h-6 w-24 rounded-full" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="cms-skeleton h-6 w-16 rounded-full" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="cms-skeleton h-4 w-24" />
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="cms-skeleton h-8 w-16" />
                      </td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
          {loadMore && hasMore ? (
            <div className="border-t border-crs-border/70 bg-crs-bg/50">
              <button
                type="button"
                onClick={() => void onLoadMore()}
                disabled={loadingMore}
                aria-busy={loadingMore}
                className="flex w-full flex-col items-center gap-1 px-4 py-3.5 text-center transition-colors hover:bg-crs-accent/10 disabled:opacity-70"
              >
                <span className="inline-flex items-center gap-1.5 text-sm font-medium text-crs-primary">
                  {loadingMore ? t("loadMoreLoading", lang) : t("loadMore", lang)}
                  {loadingMore ? null : (
                    <IconChevron className="h-3.5 w-3.5 rotate-90" />
                  )}
                </span>
                <span className="text-xs text-crs-muted">{tf("showingResults", lang, { n: rows.length })}</span>
              </button>
              {loadError ? (
                <p className="px-4 pb-3 text-center text-xs text-red-600">{t("loadMoreError", lang)}</p>
              ) : null}
            </div>
          ) : (
            <div className="border-t border-crs-border/70 px-4 py-3 text-xs text-crs-muted">
              <p>{tf("showingResults", lang, { n: rows.length })}</p>
            </div>
          )}
        </div>
      )}

      {bulk ? (
        <ContentListBulkBar
          selectedCount={selectedCount}
          canRecycle={bulk.canRecycle}
          canUnpublish={bulk.canUnpublish !== false}
          busy={bulkBusy}
          onClear={() => setSelected(new Set())}
          onUnpublish={() => setBulkDialog({ kind: "confirm", action: "unpublish" })}
          onRecycle={() => setBulkDialog({ kind: "confirm", action: "recycle" })}
          onDuplicate={() => setBulkDialog({ kind: "confirm", action: "clone" })}
        />
      ) : null}

      {bulk && bulkDialog ? (
        <ContentListBulkModal
          dialog={bulkDialog}
          busy={bulkBusy}
          selectedCount={selectedCount}
          publishedCount={publishedSelected}
          kind={bulk.kind}
          canUnpublish={bulk.canUnpublish !== false}
          onCancel={() => setBulkDialog(null)}
          onConfirm={() => void onConfirmBulk()}
          onDismiss={() => setBulkDialog(null)}
        />
      ) : null}

      <CloneDialogs
        dialog={cloneDialog}
        busy={cloneBusy}
        onCancel={() => setCloneDialog(null)}
        onConfirm={() => void onConfirmRowClone()}
        onOpenDraft={() => {
          if (cloneDialog?.kind === "result") window.location.assign(cloneDialog.clone.href);
        }}
        onUndo={() => void onUndoRowClone()}
        onClose={() => setCloneDialog(null)}
      />
    </main>
  );
}

type EditShellProps = {
  breadcrumbs: { href?: string; label: string }[];
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
  cloneItemId?: string;
};

/** Desk create/edit page shell. */
export function EditPageShell({
  breadcrumbs,
  title,
  subtitle,
  children,
  wide,
  cloneItemId,
}: EditShellProps) {
  return (
    <main
      className={`mx-auto flex w-full flex-col gap-6 px-6 py-8 font-sans lg:px-10 ${
        wide ? "max-w-4xl" : "max-w-3xl"
      }`}
    >
      <PageBreadcrumb items={breadcrumbs} />
      <DeskPageHeader
        title={title}
        subtitle={subtitle}
        actions={cloneItemId ? <CloneItemButton itemId={cloneItemId} /> : undefined}
      />
      {children}
    </main>
  );
}
