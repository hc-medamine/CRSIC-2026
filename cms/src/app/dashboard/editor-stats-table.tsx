"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { SortableTh } from "@/app/dashboard/sortable-th";
import { sortRows, toggleHeaderSort, type HeaderSort, type SortKind } from "@/lib/content/headerSort";
import type { EditorStat } from "@/lib/content/queues";
import { localizedDisplayName, statusLabel, t, type CmsLang } from "@/lib/i18n/labels";

/** Status → badge/dot colour pairs for the content-by-editor stats table. */
const STATUS_STYLES: Record<string, { badge: string; dot: string }> = {
  draft: { badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  submitted: { badge: "bg-sky-100 text-sky-800", dot: "bg-sky-500" },
  changes_requested: { badge: "bg-violet-100 text-violet-800", dot: "bg-violet-500" },
  approved: { badge: "bg-teal-100 text-teal-800", dot: "bg-teal-500" },
  published: { badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" },
  rejected: { badge: "bg-rose-100 text-rose-800", dot: "bg-rose-500" },
};

function editorName(editor: EditorStat, lang: CmsLang): string {
  return localizedDisplayName(
    {
      displayName: editor.editorName,
      nameAr: editor.editorNameAr,
      nameEn: editor.editorNameEn,
    },
    lang,
  );
}

function columnCount(editor: EditorStat, status: string): number {
  return status === "published" ? editor.publishedCount : (editor.counts[status] ?? 0);
}

export function EditorStatsTable({
  editors,
  columns,
  lang,
}: {
  editors: EditorStat[];
  columns: readonly string[];
  lang: CmsLang;
}) {
  const [sort, setSort] = useState<HeaderSort | null>(null);

  function getValue(row: EditorStat, key: string): string | number {
    if (key === "name") return editorName(row, lang);
    if (key === "total") return row.total;
    return columnCount(row, key);
  }

  function kindFor(key: string): SortKind {
    return key === "name" ? "text" : "number";
  }

  const rows = useMemo(
    () => sortRows(editors, sort, getValue, kindFor, lang),
    // getValue/kindFor close over lang only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editors, sort, lang],
  );

  return (
    <div className="cms-card-lift mt-3 overflow-hidden rounded-2xl border border-crs-border bg-crs-surface shadow-[0_1px_3px_rgba(26,46,38,0.06)]">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-crs-border/70 text-left text-xs text-crs-muted">
              <SortableTh
                label={t("roleEditor", lang)}
                sortKey="name"
                kind="text"
                sort={sort}
                lang={lang}
                className="px-4 py-3 font-medium"
                onToggle={(key, kind) => setSort(toggleHeaderSort(sort, key, kind))}
              />
              {columns.map((status) => {
                const style = STATUS_STYLES[status] ?? { badge: "", dot: "bg-crs-border" };
                return (
                  <SortableTh
                    key={status}
                    label={statusLabel(status, lang)}
                    sortKey={status}
                    kind="number"
                    sort={sort}
                    lang={lang}
                    align="center"
                    className="px-3 py-3 text-center font-medium"
                    onToggle={(key, kind) => setSort(toggleHeaderSort(sort, key, kind))}
                  >
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} aria-hidden />
                      {statusLabel(status, lang)}
                    </span>
                  </SortableTh>
                );
              })}
              <SortableTh
                label={t("statsEditorTotal", lang)}
                sortKey="total"
                kind="number"
                sort={sort}
                lang={lang}
                align="end"
                className="px-4 py-3 text-right font-medium"
                onToggle={(key, kind) => setSort(toggleHeaderSort(sort, key, kind))}
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((editor, rowIndex) => (
              <tr
                key={editor.editorId}
                className="cms-stat-row cms-row-enter border-b border-crs-border/40 last:border-b-0"
                style={{ "--row-delay": `${Math.min(rowIndex, 11) * 45}ms` } as CSSProperties}
              >
                <td className="px-4 py-3 font-medium text-crs-ink" dir="auto">
                  {editorName(editor, lang)}
                </td>
                {columns.map((status) => {
                  const count = columnCount(editor, status);
                  const style = STATUS_STYLES[status] ?? { badge: "", dot: "" };
                  return (
                    <td key={status} className="px-3 py-3 text-center">
                      {count > 0 ? (
                        <span
                          className={`cms-stat-cell cms-stat-badge ${style.badge}`}
                          style={
                            { "--row-delay": `${Math.min(rowIndex, 11) * 45}ms` } as CSSProperties
                          }
                        >
                          {count}
                        </span>
                      ) : (
                        <span className="text-crs-border">·</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-4 py-3 text-right">
                  <span className="cms-count-pop text-base font-semibold text-crs-ink">
                    {editor.total}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
