"use client";

import { useCallback, useEffect, useState } from "react";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { useRouter } from "next/navigation";

type Editor = { id: string; display_name: string; email: string };

type Props = {
  /** When set, Super Admin manages Away for this user; otherwise self. */
  targetUserId?: string;
  canManage: boolean;
};

export function AwayPanel({ targetUserId, canManage }: Props) {
  const router = useRouter();
  const [isAway, setIsAway] = useState(false);
  const [awayUntil, setAwayUntil] = useState("");
  const [delegateName, setDelegateName] = useState<string | null>(null);
  const [editors, setEditors] = useState<Editor[]>([]);
  const [elevateId, setElevateId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!canManage) return;
    const q = targetUserId ? `?userId=${encodeURIComponent(targetUserId)}` : "";
    const res = await fetch(`/api/content/away${q}`);
    const data = (await res.json()) as {
      ok: boolean;
      away?: {
        isAway: boolean;
        awayUntil: string | null;
        awayDelegateName: string | null;
      };
      editors?: Editor[];
      error?: string;
    };
    if (!res.ok || !data.ok) {
      const msg = data.error ?? "Failed to load Away state";
      setError(msg);
      cmsToast.error(msg);
      return;
    }
    setIsAway(Boolean(data.away?.isAway));
    setAwayUntil(data.away?.awayUntil ? data.away.awayUntil.slice(0, 10) : "");
    setDelegateName(data.away?.awayDelegateName ?? null);
    setEditors(data.editors ?? []);
  }, [canManage, targetUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!canManage) return null;

  async function run(action: "set" | "clear") {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/content/away", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId: targetUserId,
          elevateEditorId: elevateId || undefined,
          awayUntil: awayUntil || null,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? "Failed";
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      const msg = action === "set" ? "Away set." : "Away cleared.";
      setMessage(msg);
      cmsToast.success(msg);
      await load();
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-2 rounded-2xl border border-crs-border bg-crs-surface p-4 shadow-sm">
      <h2 className="text-lg font-medium text-crs-ink">Out of office (Away)</h2>
      <p className="text-xs text-crs-muted">
        While Away, your review actions are frozen. Pick one Editor to elevate to temporary Reviewer.
        All Editors are notified. Role reverts when you clear Away or the until-date passes.
      </p>
      {isAway ? (
        <p className="text-sm text-amber-900">
          Currently Away
          {awayUntil ? ` until ${awayUntil}` : ""}
          {delegateName ? ` · temp Reviewer: ${delegateName}` : ""}
        </p>
      ) : (
        <p className="text-sm text-crs-muted">Not Away.</p>
      )}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      {!isAway ? (
        <div className="flex flex-col gap-2">
          <label className="text-sm">
            <span className="font-medium">Elevate Editor (required)</span>
            <select
              value={elevateId}
              onChange={(e) => setElevateId(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            >
              <option value="">— select Editor —</option>
              {editors.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.display_name} ({e.email})
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Until date (optional)</span>
            <input
              type="date"
              value={awayUntil}
              onChange={(e) => setAwayUntil(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <button
            type="button"
            disabled={pending || !elevateId}
            onClick={() => void run("set")}
            className="w-fit rounded-lg bg-crs-primary hover:bg-crs-secondary px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {pending ? "Saving…" : "Set Away"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={() => void run("clear")}
          className="w-fit inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
        >
          {pending ? "Clearing…" : "Clear Away"}
        </button>
      )}
    </section>
  );
}
