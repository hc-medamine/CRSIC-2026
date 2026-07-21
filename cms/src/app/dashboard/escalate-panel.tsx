"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format-datetime";

type Props = {
  contentItemId: string;
  canEscalate: boolean;
  escalatedAt?: string | null;
};

export function EscalatePanel({ contentItemId, canEscalate, escalatedAt }: Props) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  if (!canEscalate) {
    return escalatedAt ? (
      <p className="text-xs text-amber-800">
        Escalated at {formatDateTime(escalatedAt)}
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
        setError(data.error ?? "Escalate failed");
        return;
      }
      setMessage("Escalated to Super Admin.");
      setNote("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <h2 className="text-lg font-medium text-amber-950">Escalate</h2>
      <p className="text-xs text-amber-900">
        Notify Super Admin and add a note to the comment thread. Note is required.
      </p>
      {escalatedAt ? (
        <p className="text-xs text-amber-800">
          Last escalated: {formatDateTime(escalatedAt)}
        </p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Why escalate?"
        className="w-full rounded border px-3 py-2 text-sm"
        disabled={pending}
      />
      <button
        type="button"
        disabled={pending || !note.trim()}
        onClick={() => void escalate()}
        className="w-fit rounded border border-amber-700 px-3 py-1.5 text-sm text-amber-950 disabled:opacity-60"
      >
        {pending ? "Escalating…" : "Escalate to Super Admin"}
      </button>
    </section>
  );
}
