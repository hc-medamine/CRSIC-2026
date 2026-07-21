"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format-datetime";

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
        setError(data.error ?? "Failed");
        return;
      }
      setMessage(
        action === "publish"
          ? "Published with post-review flag."
          : action === "confirm"
            ? "Post-review confirmed."
            : action === "unpublish"
              ? "Unpublished."
              : "Change request posted.",
      );
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
      <h2 className="text-lg font-medium text-red-950">Emergency publish</h2>
      <p className="text-xs text-red-900">
        Super Admin only: go live immediately and require post-publication review. Reason is
        required and is recorded in the comment thread and audit log.
      </p>

      {needsPostReview ? (
        <div className="rounded border border-red-300 bg-white px-3 py-2 text-sm text-red-950">
          <p>
            <strong>Needs post-publication review</strong>
            {emergencyPublishedByName ? ` · by ${emergencyPublishedByName}` : ""}
            {emergencyPublishedAt ? ` · ${formatDateTime(emergencyPublishedAt)}` : ""}
          </p>
          {emergencyReason ? (
            <p className="mt-1 text-xs text-red-800" dir="auto">
              Reason: {emergencyReason}
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
            placeholder="Why emergency publish?"
            className="w-full rounded border px-3 py-2 text-sm"
            disabled={pending}
          />
          <button
            type="button"
            disabled={pending || !reason.trim()}
            onClick={() => void run("publish", { reason })}
            className="w-fit rounded bg-red-800 px-3 py-1.5 text-sm text-white disabled:opacity-60"
          >
            {pending ? "Publishing…" : "Emergency publish now"}
          </button>
        </>
      ) : null}

      {needsPostReview && canPostReview ? (
        <div className="mt-2 grid gap-2 border-t border-red-200 pt-3">
          <p className="text-xs font-medium text-red-950">Post-publication review</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || !canConfirmOk}
              title={
                canConfirmOk
                  ? undefined
                  : "The Super Admin who emergency-published cannot Confirm OK"
              }
              onClick={() => void run("confirm")}
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-60"
            >
              Confirm OK
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void run("unpublish")}
              className="rounded border border-red-700 px-3 py-1.5 text-sm text-red-950 disabled:opacity-60"
            >
              Unpublish
            </button>
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Request changes (keeps live + flag)…"
            className="w-full rounded border px-3 py-2 text-sm"
            disabled={pending}
          />
          <button
            type="button"
            disabled={pending || !note.trim()}
            onClick={() => void run("request_changes", { note })}
            className="w-fit rounded border px-3 py-1.5 text-sm disabled:opacity-60"
          >
            Request changes
          </button>
        </div>
      ) : null}
    </section>
  );
}
