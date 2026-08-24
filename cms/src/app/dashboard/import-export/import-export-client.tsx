"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageShell } from "@/app/dashboard/desk-ui";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { contentTypeLabel, t, tf } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import { ALL_CONTENT_TYPES, type ContentType } from "@/lib/content-types";
import { EXPORT_COUNT_WARN, type ExportPickerRow, type ImportReport } from "@/lib/content/importExportLogic";

const BTN_PRIMARY =
  "inline-flex min-h-11 items-center rounded-xl bg-crs-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-crs-secondary disabled:opacity-50";
const BTN_SECONDARY =
  "inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2.5 text-sm font-medium text-crs-ink hover:bg-crs-bg disabled:opacity-50";
const INPUT =
  "w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink";

type ListResponse = {
  ok: boolean;
  error?: string;
  items?: ExportPickerRow[];
  count?: number;
};

export function ImportExportClient() {
  const lang = useCmsLang();
  const [type, setType] = useState<ContentType>("news");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ExportPickerRow[]>([]);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [confirm, setConfirm] = useState<
    | { kind: "export-type" }
    | { kind: "export-item"; id: string; title: string }
    | { kind: "import"; file: File }
    | null
  >(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ type, q });
    const res = await fetch(`/api/import-export?${params}`);
    const data = (await res.json()) as ListResponse;
    if (!res.ok || !data.ok) {
      cmsToast.error(data.error ?? t("actionFailed", lang));
      return;
    }
    setItems(data.items ?? []);
    setCount(data.count ?? 0);
  }, [type, q, lang]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ type, q });
    void fetch(`/api/import-export?${params}`)
      .then(async (res) => {
        const data = (await res.json()) as ListResponse;
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          cmsToast.error(data.error ?? t("actionFailed", lang));
          return;
        }
        setItems(data.items ?? []);
        setCount(data.count ?? 0);
      })
      .catch(() => {
        if (!cancelled) cmsToast.error(t("actionFailed", lang));
      });
    return () => {
      cancelled = true;
    };
  }, [type, q, lang]);

  async function downloadExport(id?: string) {
    setBusy(true);
    try {
      const params = new URLSearchParams({ type });
      if (id) params.set("id", id);
      const res = await fetch(`/api/import-export/export?${params}`);
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
      await load();
    } finally {
      setBusy(false);
      setConfirm(null);
    }
  }

  function askExportType() {
    if (count === 0) return;
    setConfirm({ kind: "export-type" });
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
        </div>
      </section>

      <section className="rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-sm">
        <h2 className="text-lg font-semibold">{t("exportThisItem", lang)}</h2>
        <input
          className={`${INPUT} mt-3 max-w-md`}
          value={q}
          disabled={busy}
          placeholder={t("searchExportItem", lang)}
          onChange={(e) => setQ(e.target.value)}
        />
        {items.length === 0 ? (
          <p className="mt-4 text-sm text-crs-muted">{t("exportItemEmpty", lang)}</p>
        ) : (
          <ul className="mt-4 divide-y divide-crs-border">
            {items.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="min-w-0 flex-1" dir="auto">
                  {row.titleAr}
                </span>
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  disabled={busy}
                  onClick={() => setConfirm({ kind: "export-item", id: row.id, title: row.titleAr })}
                >
                  {t("exportThisItem", lang)}
                </button>
              </li>
            ))}
          </ul>
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
                  else if (confirm.kind === "export-item") void downloadExport(confirm.id);
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
