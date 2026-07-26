"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { formatDateTime } from "@/lib/format-datetime";
import { t, tf } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

type Props = {
  contentItemId: string;
  canEscalate: boolean;
  escalatedAt?: string | null;
};

export function EscalatePanel({ contentItemId, canEscalate, escalatedAt }: Props) {
  const lang = useCmsLang();
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!canEscalate) {
    return escalatedAt ? (
      <p className="text-xs text-amber-800">
        {tf("escalateAt", lang, { when: formatDateTime(escalatedAt) })}
      </p>
    ) : null;
  }

  async function escalate() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/content/escalate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentItemId, note }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("escalateFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      setMessage(t("escalateSuccess", lang));
      cmsToast.success(t("escalateSuccess", lang));
      setNote("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-lg font-medium text-amber-950">{t("escalateTitle", lang)}</h2>
      <p className="text-xs text-amber-900">{t("escalateHint", lang)}</p>
      {escalatedAt ? (
        <p className="text-xs text-amber-800">
          {tf("escalateLastAt", lang, { when: formatDateTime(escalatedAt) })}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder={t("escalatePlaceholder", lang)}
        className="w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
        disabled={pending}
      />
      <button
        type="button"
        disabled={pending || !note.trim()}
        onClick={() => void escalate()}
        className="w-fit rounded border border-amber-700 px-3 py-1.5 text-sm text-amber-950 disabled:opacity-60"
      >
        {pending ? t("escalatePending", lang) : t("escalateAction", lang)}
      </button>
    </section>
  );
}
