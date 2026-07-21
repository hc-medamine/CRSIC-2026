"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Eligible = { id: string; display_name: string; email: string; role: string };

type Props = {
  contentItemId: string;
  canPropose: boolean;
  canConfirm: boolean;
  reviewOwnerName: string | null;
  proposedOwnerName: string | null;
  proposedByName: string | null;
};

export function ReviewOwnerPanel({
  contentItemId,
  canPropose,
  canConfirm,
  reviewOwnerName,
  proposedOwnerName,
  proposedByName,
}: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<Eligible[]>([]);
  const [target, setTarget] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canPropose && !canConfirm) return;
    const res = await fetch("/api/content/review-owner?kind=eligible");
    const data = (await res.json()) as { ok: boolean; users?: Eligible[] };
    if (data.ok && data.users) setUsers(data.users);
  }, [canPropose, canConfirm]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: string, extra?: Record<string, unknown>) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/content/review-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, contentItemId, ...extra }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setMessage(action === "propose" ? "Proposal sent to Super Admin." : "Saved.");
      setTarget("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!canPropose && !canConfirm && !reviewOwnerName && !proposedOwnerName) {
    return null;
  }

  return (
    <section className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-medium text-zinc-900">Review owner</h2>
      <p className="text-xs text-zinc-500">
        Named Reviewer for this item. Reviewer proposals need Super Admin confirmation; Super Admin
        applies immediately.
      </p>
      <p className="text-sm text-zinc-700">
        Current: <strong>{reviewOwnerName ?? "—"}</strong>
        {proposedOwnerName ? (
          <>
            {" "}
            · Pending: <strong>{proposedOwnerName}</strong>
            {proposedByName ? ` (by ${proposedByName})` : ""}
          </>
        ) : null}
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      {canPropose ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="rounded border px-3 py-2 text-sm"
          >
            <option value="">— select review owner —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.display_name} ({u.role})
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={pending || !target}
            onClick={() => void run("propose", { newOwnerId: target })}
            className="rounded border px-3 py-2 text-sm disabled:opacity-60"
          >
            {pending ? "Saving…" : canConfirm ? "Set / propose owner" : "Propose owner"}
          </button>
        </div>
      ) : null}

      {canConfirm && proposedOwnerName ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => void run("confirm")}
            className="rounded bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            Confirm proposal
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => void run("reject")}
            className="rounded border px-3 py-2 text-sm disabled:opacity-60"
          >
            Reject proposal
          </button>
        </div>
      ) : null}
    </section>
  );
}
