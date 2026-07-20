"use client";

import { useEffect, useState } from "react";

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

type Props = {
  contentItemId: string;
};

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
];

export function RevisionHistory({ contentItemId }: Props) {
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/content/${contentItemId}/revisions`);
        const data = (await res.json()) as { ok: boolean; error?: string; revisions?: Revision[] };
        if (!res.ok || !data.ok || !data.revisions) {
          if (!cancelled) setError(data.error ?? "Failed to load revisions");
          return;
        }
        if (!cancelled) {
          setRevisions(data.revisions);
          setSelectedId(data.revisions[0]?.id ?? null);
          setCompareId(data.revisions[1]?.id ?? null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [contentItemId]);

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
          <p className="text-xs text-zinc-500">
            #{selected.revisionNumber} · {selected.status} ·{" "}
            {selected.authorDisplayName ?? selected.authorEmail ?? "unknown"} ·{" "}
            {new Date(selected.createdAt).toLocaleString()}
            {selected.changeSummary ? ` · ${selected.changeSummary}` : ""}
          </p>

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
