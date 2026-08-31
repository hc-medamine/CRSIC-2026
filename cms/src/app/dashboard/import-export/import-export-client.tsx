"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AdminPageShell } from "@/app/dashboard/desk-ui";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { FormStickyActions } from "@/app/dashboard/form-ux";
import { IconChevron } from "@/app/dashboard/cms-icons";
import { SortableTh } from "@/app/dashboard/sortable-th";
import { DeskListCheckbox } from "@/app/dashboard/content-list-bulk";
import { StatusPill } from "@/app/dashboard/ui-bits";
import { contentTypeLabel, t, tf } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import { ALL_CONTENT_TYPES, type ContentType } from "@/lib/content-types";
import {
  applyHeaderCheckbox,
  headerCheckboxState,
  shouldWarnLargeExport,
  EXPORT_COUNT_WARN,
  type ExportPickerRow,
  type ImportReport,
} from "@/lib/content/importExportLogic";
import {
  toggleHeaderSort,
  type ContentListSortKey,
  type HeaderSort,
  type SortKind,
} from "@/lib/content/headerSort";

const BTN_PRIMARY =
  "inline-flex min-h-11 items-center rounded-xl bg-crs-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-crs-secondary disabled:opacity-50";
const BTN_SECONDARY =
  "inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2.5 text-sm font-medium text-crs-ink hover:bg-crs-bg disabled:opacity-50";
const INPUT =
  "w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink";

const SKELETON_ROWS = 4;
const PICKER_SORT_KEYS: ContentListSortKey[] = ["title", "status", "updated"];

type ListResponse = {
  ok: boolean;
  error?: string;
  items?: ExportPickerRow[];
  count?: number;
  hasMore?: boolean;
  page?: number;
};

function formatUpdated(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 16).replace("T", " ");
}

function rowUpdatedIso(row: ExportPickerRow): string {
  const value = row.updatedAt as string | Date;
  return typeof value === "string" ? value : value.toISOString();
}

export function ImportExportClient() {
  const lang = useCmsLang();
  const [type, setType] = useState<ContentType>("news");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ExportPickerRow[]>([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sort, setSort] = useState<HeaderSort | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [ready, setReady] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: "export-type" }
    | { kind: "export-item"; id: string; title: string }
    | { kind: "export-selected" }
    | { kind: "import"; file: File }
    | null
  >(null);
  const fetchGen = useRef(0);

  const loadedIds = useMemo(() => items.map((row) => row.id), [items]);
  const headerState = headerCheckboxState(loadedIds, selected);
  const selectedCount = selected.size;

  const fetchPage = useCallback(
    async (nextPage: number, nextSort: HeaderSort | null) => {
      const params = new URLSearchParams({ type, q, page: String(nextPage) });
      if (nextSort && PICKER_SORT_KEYS.includes(nextSort.key as ContentListSortKey)) {
        params.set("sort", nextSort.key);
        params.set("dir", nextSort.dir);
      }
      const res = await fetch(`/api/import-export?${params}`);
      const data = (await res.json()) as ListResponse;
      if (!res.ok || !data.ok || !Array.isArray(data.items)) {
        return { error: data.error ?? t("actionFailed", lang) };
      }
      return {
        items: data.items,
        count: data.count ?? 0,
        hasMore: Boolean(data.hasMore),
        page: typeof data.page === "number" ? data.page : nextPage,
      };
    },
    [type, q, lang],
  );

  useEffect(() => {
    let cancelled = false;
    const gen = ++fetchGen.current;
    void fetchPage(1, sort)
      .then((result) => {
        if (cancelled || gen !== fetchGen.current) return;
        if ("error" in result) {
          cmsToast.error(result.error);
          setLoadError(true);
          setHasMore(false);
          setReady(true);
          return;
        }
        setLoadError(false);
        setItems(result.items);
        setCount(result.count);
        setHasMore(result.hasMore);
        setPage(result.page);
        setReady(true);
      })
      .catch(() => {
        if (cancelled || gen !== fetchGen.current) return;
        cmsToast.error(t("actionFailed", lang));
        setLoadError(true);
        setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage, sort, lang]);

  async function downloadExport(opts?: { id?: string; ids?: string[] }) {
    setBusy(true);
    try {
      const res = opts?.ids
        ? await fetch("/api/import-export/export", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ type, ids: opts.ids }),
          })
        : await fetch(
            `/api/import-export/export?${new URLSearchParams({
              type,
              ...(opts?.id ? { id: opts.id } : {}),
            })}`,
          );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        cmsToast.error(data.error ?? t("actionFailed", lang));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const cd = res.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/.exec(cd);
      a.href = url;
      a.download = match?.[1] ?? `crsic-${type}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      cmsToast.success(t("exportReady", lang));
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  async function runImport(file: File) {
    setBusy(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/import-export", { method: "POST", body: form });
      const data = (await res.json()) as { ok: boolean; error?: string; report?: ImportReport };
      if (!res.ok || !data.ok || !data.report) {
        cmsToast.error(data.error ?? t("actionFailed", lang));
        return;
      }
      setReport(data.report);
      cmsToast.success(tf("importReportShort", lang, { n: String(data.report.imported) }));
      const result = await fetchPage(1, sort);
      if (!("error" in result)) {
        setItems(result.items);
        setCount(result.count);
        setHasMore(result.hasMore);
        setPage(result.page);
      }
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  function askExportType() {
    if (count === 0) return;
    setConfirm({ kind: "export-type" });
  }

  async function rebuildWebpForType() {
    setBusy(true);
    try {
      const res = await fetch("/api/import-export/rebuild-webp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; pathsWritten?: number };
      if (!res.ok || !data.ok) {
        cmsToast.error(data.error ?? t("actionFailed", lang));
        return;
      }
      cmsToast.success(
        tf("rebuildWebpDone", lang, { n: String(data.pathsWritten ?? 0) }),
      );
    } finally {
      setBusy(false);
    }
  }

  async function rebuildDirectorWebp() {
    setBusy(true);
    try {
      const res = await fetch("/api/import-export/rebuild-webp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ director: true }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; pathsWritten?: number };
      if (!res.ok || !data.ok) {
        cmsToast.error(data.error ?? t("actionFailed", lang));
        return;
      }
      cmsToast.success(
        tf("rebuildWebpDone", lang, { n: String(data.pathsWritten ?? 0) }),
      );
    } finally {
      setBusy(false);
    }
  }

  function onToggleSort(key: string, kind: SortKind) {
    setSort(toggleHeaderSort(sort, key, kind));
  }

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function onLoadMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    setLoadError(false);
    const gen = fetchGen.current;
    try {
      const result = await fetchPage(page + 1, sort);
      if (gen !== fetchGen.current) return;
      if ("error" in result) {
        setLoadError(true);
        return;
      }
      setItems((prev) => {
        const seen = new Set(prev.map((row) => row.id));
        return [...prev, ...result.items.filter((row) => !seen.has(row.id))];
      });
      setCount(result.count);
      setHasMore(result.hasMore);
      setPage(result.page);
    } catch {
      if (gen === fetchGen.current) setLoadError(true);
    } finally {
      if (gen === fetchGen.current) setLoadingMore(false);
    }
  }

  return (
    <AdminPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("importExport", lang) },
      ]}
      title={t("importExport", lang)}
      subtitle={t("pageDescImportExport", lang)}
    >
      <section className="rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-sm">
        <label className="grid gap-1 text-sm">
          <span className="font-medium">{t("fieldContentType", lang)}</span>
          <select
            className={`${INPUT} max-w-md`}
            value={type}
            disabled={busy}
            onChange={(e) => {
              setType(e.target.value as ContentType);
              setQ("");
              setSort(null);
              setSelected(new Set());
              setItems([]);
              setPage(1);
              setHasMore(false);
              setReady(false);
              setReport(null);
            }}
          >
            {ALL_CONTENT_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {contentTypeLabel(ct, lang)}
              </option>
            ))}
          </select>
        </label>
        <p className="mt-3 text-sm text-crs-muted">
          {count === 0
            ? t("exportTypeEmpty", lang)
            : tf("exportTypeCount", lang, { n: String(count) })}
          {count > EXPORT_COUNT_WARN ? ` ${t("exportTypeLargeWarn", lang)}` : ""}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={busy || count === 0}
            onClick={askExportType}
          >
            {t("exportThisType", lang)}
          </button>
          <button
            type="button"
            className={BTN_SECONDARY}
            disabled={busy}
            onClick={rebuildWebpForType}
          >
            {t("rebuildWebpThisType", lang)}
          </button>
          <button
            type="button"
            className={BTN_SECONDARY}
            disabled={busy}
            onClick={rebuildDirectorWebp}
          >
            {t("rebuildWebpDirector", lang)}
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-crs-border bg-crs-surface shadow-sm">
        <div className="p-5 pb-3">
          <h2 className="text-lg font-semibold">{t("exportPickerHeading", lang)}</h2>
          <input
            className={`${INPUT} mt-3 max-w-md`}
            value={q}
            disabled={busy}
            placeholder={t("searchExportItem", lang)}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {!ready ? (
          <p className="px-5 pb-5 text-sm text-crs-muted">{t("loadMoreLoading", lang)}</p>
        ) : items.length === 0 ? (
          <p className="px-5 pb-5 text-sm text-crs-muted">{t("exportItemEmpty", lang)}</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-start text-sm">
                <thead className="border-b border-crs-border bg-crs-bg/80 text-xs uppercase tracking-wide text-crs-muted">
                  <tr>
                    <th className="w-12 px-2 py-3.5">
                      <DeskListCheckbox
                        checked={headerState.checked}
                        indeterminate={headerState.indeterminate}
                        onChange={(checked) => setSelected(applyHeaderCheckbox(loadedIds, selected, checked))}
                        label={t("bulkSelectLoaded", lang)}
                      />
                    </th>
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
                  {items.map((row, i) => (
                    <tr
                      key={row.id}
                      className="group relative cms-row-enter border-s-2 border-s-transparent transition-colors hover:border-s-crs-accent hover:bg-crs-accent/5"
                      style={{ "--row-delay": `${Math.min(i, 11) * 45}ms` } as CSSProperties}
                    >
                      <td className="relative z-10 w-12 px-2 py-3.5">
                        <DeskListCheckbox
                          checked={selected.has(row.id)}
                          onChange={(checked) => toggleOne(row.id, checked)}
                          label={`${t("bulkSelectRow", lang)}: ${row.titleAr || t("untitled", lang)}`}
                        />
                      </td>
                      <td className="px-4 py-3.5 font-medium text-crs-ink" dir="auto">
                        {row.titleAr || t("untitled", lang)}
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-4 py-3.5 text-crs-muted">{formatUpdated(rowUpdatedIso(row))}</td>
                      <td className="relative z-10 px-4 py-3.5">
                        <button
                          type="button"
                          className={BTN_SECONDARY}
                          disabled={busy}
                          onClick={() =>
                            setConfirm({
                              kind: "export-item",
                              id: row.id,
                              title: row.titleAr || t("untitled", lang),
                            })
                          }
                        >
                          {t("exportThisItem", lang)}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {loadingMore
                    ? Array.from({ length: SKELETON_ROWS }, (_, i) => (
                        <tr key={`sk-${i}`} aria-hidden className="border-s-2 border-s-transparent">
                          <td className="px-2 py-3.5" />
                          <td className="px-4 py-3.5">
                            <div className="cms-skeleton h-4 w-2/5" />
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="cms-skeleton h-6 w-24 rounded-full" />
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
            </div>
            {hasMore ? (
              <div className="border-t border-crs-border/70 bg-crs-bg/50">
                <button
                  type="button"
                  onClick={() => void onLoadMore()}
                  disabled={loadingMore || busy}
                  aria-busy={loadingMore}
                  className="flex w-full flex-col items-center gap-1 px-4 py-3.5 text-center transition-colors hover:bg-crs-accent/10 disabled:opacity-70"
                >
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-crs-primary">
                    {loadingMore ? t("loadMoreLoading", lang) : t("loadMore", lang)}
                    {loadingMore ? null : <IconChevron className="h-3.5 w-3.5 rotate-90" />}
                  </span>
                  <span className="text-xs text-crs-muted">{tf("showingResults", lang, { n: items.length })}</span>
                </button>
                {loadError ? (
                  <p className="px-4 pb-3 text-center text-xs text-red-600">{t("loadMoreError", lang)}</p>
                ) : null}
              </div>
            ) : (
              <div className="border-t border-crs-border/70 px-4 py-3 text-xs text-crs-muted">
                <p>{tf("showingResults", lang, { n: items.length })}</p>
              </div>
            )}
          </>
        )}
      </section>

      <section className="rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">{t("importZip", lang)}</h2>
        <p className="mt-2 text-sm text-crs-muted">{t("importZipHint", lang)}</p>
        <input
          className="mt-4 block"
          type="file"
          accept=".zip,application/zip"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) setConfirm({ kind: "import", file });
          }}
        />
      </section>

      {report ? (
        <section className="rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">{t("importReport", lang)}</h2>
            <button type="button" className={BTN_SECONDARY} onClick={() => setReport(null)}>
              {t("dismiss", lang)}
            </button>
          </div>
          <p className="mt-2 text-sm">
            {tf("importReportCounts", lang, {
              imported: String(report.imported),
              skipped: String(report.skipped),
            })}
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {report.items.map((row, i) => (
              <li key={`${row.sourceId}-${i}`} dir="auto">
                {row.skipped
                  ? `${row.titleAr || row.sourceId || "—"} — ${row.skipped}`
                  : `${row.titleAr} → ${row.newId ?? ""}`}
                {row.notes.length ? ` (${row.notes.join(", ")})` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {selectedCount > 0 ? (
        <FormStickyActions>
          <p className="me-auto text-sm text-crs-ink">{tf("bulkSelected", lang, { n: selectedCount })}</p>
          <button type="button" className={BTN_SECONDARY} disabled={busy} onClick={() => setSelected(new Set())}>
            {t("bulkClear", lang)}
          </button>
          <button
            type="button"
            className={BTN_PRIMARY}
            disabled={busy}
            onClick={() => setConfirm({ kind: "export-selected" })}
          >
            {t("exportSelected", lang)}
          </button>
        </FormStickyActions>
      ) : null}

      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-crs-border bg-crs-surface p-6 shadow-lg">
            <p className="text-sm">
              {confirm.kind === "export-type"
                ? count > EXPORT_COUNT_WARN
                  ? t("confirmExportTypeLarge", lang)
                  : t("confirmExportType", lang)
                : confirm.kind === "export-item"
                  ? tf("confirmExportItem", lang, { title: confirm.title })
                  : confirm.kind === "export-selected"
                    ? shouldWarnLargeExport(selectedCount)
                      ? tf("confirmExportSelectedLarge", lang, { n: String(selectedCount) })
                      : tf("confirmExportSelected", lang, { n: String(selectedCount) })
                    : t("confirmImportZip", lang)}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className={BTN_SECONDARY} disabled={busy} onClick={() => setConfirm(null)}>
                {t("actionCancel", lang)}
              </button>
              <button
                type="button"
                className={BTN_PRIMARY}
                disabled={busy}
                onClick={() => {
                  if (confirm.kind === "export-type") void downloadExport();
                  else if (confirm.kind === "export-item") void downloadExport({ id: confirm.id });
                  else if (confirm.kind === "export-selected") void downloadExport({ ids: [...selected] });
                  else void runImport(confirm.file);
                }}
              >
                {t("actionConfirm", lang)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
