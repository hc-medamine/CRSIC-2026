"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { formatDateTime } from "@/lib/format-datetime";
import { t, tf } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

type Props = {
  contentItemId: string;
  canEmergencyPublish: boolean;
  canPostReview: boolean;
  canConfirmOk: boolean;
  needsPostReview: boolean;
  emergencyReason?: string | null;
  emergencyPublishedAt?: string | null;
  emergencyPublishedByName?: string | null;
};

export function EmergencyPanel({
  contentItemId,
  canEmergencyPublish,
  canPostReview,
  canConfirmOk,
  needsPostReview,
  emergencyReason,
  emergencyPublishedAt,
  emergencyPublishedByName,
}: Props) {
  const lang = useCmsLang();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: string, extra?: Record<string, unknown>) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/content/emergency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, contentItemId, ...extra }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("actionFailedShort", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      const msg =
        action === "publish"
          ? t("emergencyPublishedOk", lang)
          : action === "confirm"
            ? t("emergencyConfirmedOk", lang)
            : action === "unpublish"
              ? t("emergencyUnpublishedOk", lang)
              : t("emergencyChangesOk", lang);
      setMessage(msg);
      cmsToast.success(msg);
      setReason("");
      setNote("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!canEmergencyPublish && !needsPostReview) return null;

  return (
    <section className="grid gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
      <h2 className="text-lg font-medium text-red-950">{t("emergencyPublish", lang)}</h2>
      <p className="text-xs text-red-900">{t("emergencyHint", lang)}</p>

      {needsPostReview ? (
        <div className="rounded border border-red-300 bg-white px-3 py-2 text-sm text-red-950">
          <p>
            <strong>{t("needsPostPublicationReview", lang)}</strong>
            {emergencyPublishedByName
              ? ` · ${tf("emergencyBy", lang, { name: emergencyPublishedByName })}`
              : ""}
            {emergencyPublishedAt ? ` · ${formatDateTime(emergencyPublishedAt)}` : ""}
          </p>
          {emergencyReason ? (
            <p className="mt-1 text-xs text-red-800" dir="auto">
              {tf("emergencyReasonLabel", lang, { reason: emergencyReason })}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      {canEmergencyPublish ? (
        <>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder={t("emergencyReasonPh", lang)}
            className="w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            disabled={pending}
          />
          <button
            type="button"
            disabled={pending || !reason.trim()}
            onClick={() => void run("publish", { reason })}
            className="w-fit rounded bg-red-800 px-3 py-1.5 text-sm text-white disabled:opacity-60"
          >
            {pending ? t("emergencyPublishing", lang) : t("emergencyPublishNow", lang)}
          </button>
        </>
      ) : null}

      {needsPostReview && canPostReview ? (
        <div className="mt-2 grid gap-2 border-t border-red-200 pt-3">
          <p className="text-xs font-medium text-red-950">{t("emergencyPostReviewTitle", lang)}</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !canConfirmOk}
              title={canConfirmOk ? undefined : t("emergencyConfirmBlocked", lang)}
              onClick={() => void run("confirm")}
              className="rounded-lg bg-crs-primary hover:bg-crs-secondary px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              {t("emergencyConfirmOk", lang)}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void run("unpublish")}
              className="rounded border border-red-700 px-3 py-1.5 text-sm text-red-950 disabled:opacity-60"
            >
              {t("actionUnpublish", lang)}
            </button>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder={t("emergencyRequestChangesPh", lang)}
            className="w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            disabled={pending}
          />
          <button
            type="button"
            disabled={pending || !note.trim()}
            onClick={() => void run("request_changes", { note })}
            className="inline-flex min-h-11 w-fit items-center rounded-lg border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
          >
            {t("actionRequestChanges", lang)}
          </button>
        </div>
      ) : null}
    </section>
  );
}
