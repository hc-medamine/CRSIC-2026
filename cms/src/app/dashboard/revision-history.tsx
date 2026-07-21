"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDateTime } from "@/lib/format-datetime";

type Revision = {
  id: string;
  revisionNumber: number;
  status: string;
  snapshot: Record<string, unknown>;
  changeSummary: string | null;
  createdAt: string;
  authorEmail: string | null;
  authorDisplayName: string | null;
};

type ContentType = "news" | "event" | "publication" | "partner" | "alert" | "page";

type Props = {
  contentItemId: string;
  contentType: ContentType;
  canRestore?: boolean;
};

function apiSegment(type: ContentType): string {
  if (type === "news") return "news";
  if (type === "event") return "events";
  if (type === "publication") return "publications";
  if (type === "partner") return "partners";
  if (type === "alert") return "alerts";
  return "pages";
}

const HIGHLIGHT_KEYS = [
  "title_ar",
  "title_en",
  "label_ar",
  "summary_ar",
  "status",
  "en_status",
  "image_path",
  "event_scope",
  "event_day",
  "event_month",
  "event_year",
  "event_type_ar",
  "event_display_status",
  "pub_kind",
  "partner_scope",
  "partner_date",
  "partner_emoji",
  "alert_link_url",
  "alert_link_label_ar",
  "alert_link_label_en",
];

export function RevisionHistory({ contentItemId, contentType, canRestore }: Props) {
  const router = useRouter();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/${contentItemId}/revisions`);
      const data = (await res.json()) as { ok: boolean; error?: string; revisions?: Revision[] };
      if (!res.ok || !data.ok || !data.revisions) {
        setError(data.error ?? "Failed to load revisions");
        return;
      }
      setRevisions(data.revisions);
      setSelectedId((prev) => prev ?? data.revisions?.[0]?.id ?? null);
      setCompareId((prev) => prev ?? data.revisions?.[1]?.id ?? null);
    } finally {
      setLoading(false);
    }
  }, [contentItemId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function restore() {
    if (!selectedId) return;
    setRestoring(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/${apiSegment(contentType)}/${contentItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore_revision", revisionId: selectedId }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Restore failed");
        return;
      }
      setMessage("Revision restored onto the editable draft.");
      await load();
      router.refresh();
    } finally {
      setRestoring(false);
    }
  }

  const selected = revisions.find((r) => r.id === selectedId) ?? null;
  const compare = revisions.find((r) => r.id === compareId) ?? null;

  function fieldValue(snap: Record<string, unknown> | null | undefined, key: string): string {
    if (!snap || !(key in snap)) return "—";
    const v = snap[key];
    if (v === null || v === undefined || v === "") return "—";
    return String(v);
  }

  const keys = (() => {
    const set = new Set<string>(HIGHLIGHT_KEYS);
    if (selected) Object.keys(selected.snapshot).forEach((k) => set.add(k));
    if (compare) Object.keys(compare.snapshot).forEach((k) => set.add(k));
    return [...set];
  })();

  return (
    <section className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div>
        <h2 className="text-lg font-medium text-zinc-900">Revision history</h2>
        <p className="text-xs text-zinc-500">
          Select a revision to inspect. Optionally compare with a prior revision (read-only).
        </p>
      </div>

      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      {!loading && revisions.length === 0 ? (
        <p className="text-sm text-zinc-500">No revisions recorded yet.</p>
      ) : null}

      {revisions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">View</span>
            <select
              value={selectedId ?? ""}
              onChange={(e) => setSelectedId(e.target.value || null)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              {revisions.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.revisionNumber} · {r.status}
                  {r.changeSummary ? ` · ${r.changeSummary.slice(0, 40)}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Compare with (optional)</span>
            <select
              value={compareId ?? ""}
              onChange={(e) => setCompareId(e.target.value || null)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              <option value="">— none —</option>
              {revisions.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.revisionNumber} · {r.status}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {selected ? (
        <div className="rounded border border-zinc-100 bg-zinc-50 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-zinc-500">
              #{selected.revisionNumber} · {selected.status} ·{" "}
              {selected.authorDisplayName ?? selected.authorEmail ?? "unknown"} ·{" "}
              {formatDateTime(selected.createdAt)}
              {selected.changeSummary ? ` · ${selected.changeSummary}` : ""}
            </p>
            {canRestore ? (
              <button
                type="button"
                disabled={restoring}
                onClick={() => void restore()}
                className="rounded border border-emerald-300 px-2 py-1 text-xs text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
              >
                {restoring ? "Restoring…" : "Restore this revision (→ draft)"}
              </button>
            ) : null}
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500">
                  <th className="py-1 pr-2 font-medium">Field</th>
                  <th className="py-1 pr-2 font-medium">Selected</th>
                  {compare ? <th className="py-1 font-medium">Compare #{compare.revisionNumber}</th> : null}
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => {
                  const a = fieldValue(selected.snapshot, key);
                  const b = compare ? fieldValue(compare.snapshot, key) : null;
                  const changed = compare != null && a !== b;
                  return (
                    <tr
                      key={key}
                      className={changed ? "bg-amber-50" : undefined}
                    >
                      <td className="py-1 pr-2 align-top font-mono text-[11px] text-zinc-600">{key}</td>
                      <td className="py-1 pr-2 align-top break-all" dir="auto">
                        {a}
                      </td>
                      {compare ? (
                        <td className="py-1 align-top break-all" dir="auto">
                          {b}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
