"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { AdminPageShell, DeskEmptyState, HonestyCount } from "@/app/dashboard/desk-ui";
import { StatusPill, relativeShort } from "@/app/dashboard/ui-bits";
import { IconInbox } from "@/app/dashboard/cms-icons";
import { formatDateTime } from "@/lib/format-datetime";
import { contentTypeLabel, t, tf } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import type { RecycleBinClientRow } from "@/lib/content/recycleBinTypes";

type Props = {
  initialItems: RecycleBinClientRow[];
  initialStaleIds: string[];
};

type Dialog =
  | { kind: "purge"; item: RecycleBinClientRow }
  | { kind: "empty" }
  | { kind: "stale" }
  | null;

export function RecycleBinClient({ initialItems, initialStaleIds }: Props) {
  const lang = useCmsLang();
  const [items, setItems] = useState(initialItems);
  const [staleIds, setStaleIds] = useState(initialStaleIds);
  const [pending, setPending] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [typedWord, setTypedWord] = useState("");

  const staleSet = new Set(staleIds);
  const busy = pending !== null;
  const confirmWord = t("recycleConfirmWord", lang);

  useEffect(() => {
    if (!dialog) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) setDialog(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialog, busy]);

  async function post(action: string, id?: string) {
    setPending(id ?? action);
    try {
      const res = await fetch("/api/recycle-bin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, id }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        items?: RecycleBinClientRow[];
        staleIds?: string[];
      };
      if (!res.ok || !data.ok) {
        cmsToast.error(data.error ?? t("actionFailed", lang));
        return;
      }
      setItems(data.items ?? []);
      setStaleIds(data.staleIds ?? []);
      setDialog(null);
      setTypedWord("");
      cmsToast.success(action === "restore" ? t("restoredShort", lang) : t("purgedShort", lang));
    } finally {
      setPending(null);
    }
  }

  function submitDialog() {
    if (!dialog) return;
    if (dialog.kind === "purge") {
      if (typedWord.trim() !== confirmWord) {
        cmsToast.error(t("recycleConfirmMismatch", lang));
        return;
      }
      void post("purge", dialog.item.id);
      return;
    }
    if (dialog.kind === "empty") void post("empty");
    else void post("purge-stale");
  }

  const emptyBinButton =
    items.length > 0 ? (
      <button
        type="button"
        disabled={busy}
        className="inline-flex min-h-11 items-center rounded-xl border border-red-300 bg-crs-surface px-4 py-2.5 text-sm font-medium text-red-800 hover:bg-red-50 disabled:opacity-50"
        onClick={() => setDialog({ kind: "empty" })}
      >
        {t("actionEmptyBin", lang)}
      </button>
    ) : null;

  return (
    <AdminPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("recycleBin", lang) },
      ]}
      title={t("recycleBin", lang)}
      subtitle={t("pageDescRecycleBin", lang)}
      actions={emptyBinButton}
    >
      {staleIds.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-[var(--crs-shadow-soft)]">
          <p>{tf("recycleStaleBanner", lang, { n: staleIds.length })}</p>
          <button
            type="button"
            disabled={busy}
            className="inline-flex min-h-11 items-center rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
            onClick={() => setDialog({ kind: "stale" })}
          >
            {t("actionPurgeStale", lang)}
          </button>
        </div>
      ) : null}

      {items.length === 0 ? (
        <DeskEmptyState>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-crs-bg text-crs-muted">
            <IconInbox className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-medium text-crs-ink">{t("recycleBinEmpty", lang)}</p>
            <p className="mt-1 text-sm text-crs-muted">{t("recycleBinEmptyHint", lang)}</p>
          </div>
        </DeskEmptyState>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-crs-border bg-crs-surface shadow-[var(--crs-shadow-soft)]">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-start text-sm">
            <thead className="border-b border-crs-border bg-crs-bg/80 text-xs uppercase tracking-wide text-crs-muted">
              <tr>
                <th className="px-4 py-3.5 font-semibold">{t("colTitle", lang)}</th>
                <th className="px-4 py-3.5 font-semibold">{t("colType", lang)}</th>
                <th className="px-4 py-3.5 font-semibold">{t("colStatus", lang)}</th>
                <th className="px-4 py-3.5 font-semibold">{t("colBinnedAt", lang)}</th>
                <th className="px-4 py-3.5 font-semibold">
                  <span className="sr-only">{t("sectionActions", lang)}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-crs-border/70">
              {items.map((item, i) => {
                const stale = staleSet.has(item.id);
                const rowBusy = busy && (pending === item.id || pending === "empty" || pending === "purge-stale");
                return (
                  <tr
                    key={item.id}
                    className={`cms-row-enter border-s-2 transition-colors hover:bg-crs-accent/5 ${
                      stale
                        ? "border-s-amber-400 bg-amber-50/40 hover:bg-amber-50/70"
                        : "border-s-transparent hover:border-s-crs-accent"
                    }`}
                    style={{ "--row-delay": `${Math.min(i, 11) * 45}ms` } as CSSProperties}
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-crs-ink" dir="auto">
                        {item.titleAr || t("untitled", lang)}
                      </p>
                      {stale ? (
                        <p className="mt-1">
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
                            {t("recycleStaleBadge", lang)}
                          </span>
                        </p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3.5 text-crs-muted">
                      {contentTypeLabel(item.contentType, lang)}
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusPill status={item.recycledFromStatus} />
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3.5 text-crs-muted"
                      title={formatDateTime(item.recycledAt)}
                    >
                      {relativeShort(item.recycledAt, lang)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          disabled={rowBusy}
                          className="inline-flex min-h-11 items-center rounded-xl bg-crs-primary px-3 py-2 text-sm font-medium text-white hover:bg-crs-secondary disabled:opacity-50"
                          onClick={() => void post("restore", item.id)}
                        >
                          {t("actionRestore", lang)}
                        </button>
                        <button
                          type="button"
                          disabled={rowBusy}
                          className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-red-700 hover:border-red-300 hover:bg-red-50 disabled:opacity-50"
                          onClick={() => {
                            setTypedWord("");
                            setDialog({ kind: "purge", item });
                          }}
                        >
                          {t("actionDelete", lang)}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          <HonestyCount count={items.length} />
        </div>
      )}

      {dialog ? (
        <div
          className="cms-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recycle-dialog-title"
        >
          <div className="cms-modal-panel w-full max-w-md rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-lg">
            <h2 id="recycle-dialog-title" className="text-base font-semibold text-crs-ink">
              {dialog.kind === "purge"
                ? t("recyclePurgeTitle", lang)
                : dialog.kind === "empty"
                  ? t("recycleEmptyTitle", lang)
                  : t("recycleStaleTitle", lang)}
            </h2>
            <p className="mt-2 text-sm text-crs-muted" dir="auto">
              {dialog.kind === "purge"
                ? tf("confirmPurgeItem", lang, { title: dialog.item.titleAr || t("untitled", lang) })
                : dialog.kind === "empty"
                  ? tf("confirmEmptyBin", lang, { n: items.length })
                  : tf("confirmPurgeStale", lang, { n: staleIds.length })}
            </p>
            {dialog.kind === "purge" ? (
              <label className="mt-4 block text-sm">
                <span className="font-medium text-crs-ink">
                  {tf("recycleTypeToConfirm", lang, { word: confirmWord })}
                </span>
                <input
                  autoFocus
                  value={typedWord}
                  onChange={(e) => setTypedWord(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitDialog();
                    }
                  }}
                  className="mt-1 block w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
                  dir={lang === "ar" ? "rtl" : "ltr"}
                />
              </label>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-50"
                disabled={busy}
                onClick={() => setDialog(null)}
              >
                {t("actionCancel", lang)}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-60"
                disabled={
                  busy ||
                  (dialog.kind === "purge" && typedWord.trim() !== confirmWord)
                }
                onClick={submitDialog}
              >
                {dialog.kind === "purge"
                  ? t("actionDelete", lang)
                  : dialog.kind === "empty"
                    ? t("actionEmptyBin", lang)
                    : t("actionPurgeStale", lang)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPageShell>
  );
}
