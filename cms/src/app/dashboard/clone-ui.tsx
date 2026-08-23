"use client";

import { useEffect, useState } from "react";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import { t } from "@/lib/i18n/labels";

export type CloneResult = { id: string; title: string; href: string };

type Dialog =
  | { kind: "confirm"; sourceId: string }
  | { kind: "result"; clone: CloneResult };

export async function postClone(id: string, failLabel: string): Promise<CloneResult> {
  const res = await fetch("/api/content/clone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "clone", id }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string; item?: CloneResult };
  if (!res.ok || !data.ok || !data.item?.id || !data.item.href) {
    throw new Error(data.error ?? failLabel);
  }
  return data.item;
}

export async function postCloneUndo(id: string, failLabel: string): Promise<void> {
  const res = await fetch("/api/content/clone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "undo", id }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) throw new Error(data.error ?? failLabel);
}

export function CloneDialogs({
  dialog,
  busy,
  onCancel,
  onConfirm,
  onOpenDraft,
  onUndo,
  onClose,
}: {
  dialog: Dialog | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onOpenDraft: () => void;
  onUndo: () => void;
  onClose: () => void;
}) {
  const lang = useCmsLang();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) {
        if (dialog?.kind === "confirm") onCancel();
        else if (dialog?.kind === "result") onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, dialog, onCancel, onClose]);

  if (!dialog) return null;

  const title = dialog.kind === "confirm" ? t("cloneConfirmTitle", lang) : t("cloneResultTitle", lang);

  return (
    <div
      className="cms-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clone-dialog-title"
    >
      <div className="cms-modal-panel w-full max-w-md rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-lg">
        <h2 id="clone-dialog-title" className="text-base font-semibold text-crs-ink">
          {title}
        </h2>
        <p className="mt-2 text-sm text-crs-muted">
          {dialog.kind === "confirm" ? t("cloneConfirmBody", lang) : t("cloneResultBody", lang)}
        </p>
        {dialog.kind === "result" ? (
          <p className="mt-2 text-sm text-crs-ink" dir="auto">
            {dialog.clone.title}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {dialog.kind === "confirm" ? (
            <>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-50"
                disabled={busy}
                onClick={onCancel}
              >
                {t("actionCancel", lang)}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-xl bg-crs-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-crs-secondary disabled:opacity-60"
                disabled={busy}
                onClick={onConfirm}
              >
                {t("actionDuplicate", lang)}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-50"
                disabled={busy}
                onClick={onUndo}
              >
                {t("cloneCancelClone", lang)}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-50"
                disabled={busy}
                onClick={onClose}
              >
                {t("cloneClose", lang)}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-xl bg-crs-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-crs-secondary disabled:opacity-60"
                disabled={busy}
                onClick={onOpenDraft}
              >
                {t("cloneOpenDraft", lang)}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function CloneItemButton({ itemId }: { itemId: string }) {
  const lang = useCmsLang();
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  async function confirm() {
    if (!dialog || dialog.kind !== "confirm") return;
    setBusy(true);
    try {
      const clone = await postClone(dialog.sourceId, t("actionFailed", lang));
      setDialog({ kind: "result", clone });
    } catch (err) {
      cmsToast.error(err instanceof Error ? err.message : t("actionFailed", lang));
      setDialog(null);
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    if (!dialog || dialog.kind !== "result") return;
    setBusy(true);
    try {
      await postCloneUndo(dialog.clone.id, t("actionFailed", lang));
      cmsToast.success(t("cloneUndone", lang));
      setDialog(null);
    } catch (err) {
      cmsToast.error(err instanceof Error ? err.message : t("actionFailed", lang));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm font-medium text-crs-ink hover:bg-crs-bg"
        onClick={() => setDialog({ kind: "confirm", sourceId: itemId })}
      >
        {t("actionDuplicate", lang)}
      </button>
      <CloneDialogs
        dialog={dialog}
        busy={busy}
        onCancel={() => setDialog(null)}
        onConfirm={() => void confirm()}
        onOpenDraft={() => {
          if (dialog?.kind === "result") window.location.assign(dialog.clone.href);
        }}
        onUndo={() => void undo()}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
