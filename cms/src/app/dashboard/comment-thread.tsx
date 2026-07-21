"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Comment = {
  id: string;
  body: string;
  kind: "general" | "changes_requested" | "rejected";
  createdAt: string;
  authorEmail: string | null;
  authorDisplayName: string | null;
};

type Props = {
  contentItemId: string;
  /** Bump when parent refreshes after workflow actions so the thread reloads. */
  refreshToken?: string;
};

function kindLabel(kind: Comment["kind"]): string | null {
  if (kind === "changes_requested") return "Changes requested";
  if (kind === "rejected") return "Rejected";
  return null;
}

export function CommentThread({ contentItemId, refreshToken }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [canComment, setCanComment] = useState(false);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/${contentItemId}/comments`);
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        comments?: Comment[];
        canComment?: boolean;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to load comments");
        return;
      }
      setComments(data.comments ?? []);
      setCanComment(Boolean(data.canComment));
    } finally {
      setLoading(false);
    }
  }, [contentItemId]);

  useEffect(() => {
    void load();
  }, [load, refreshToken]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/content/${contentItemId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; comment?: Comment };
      if (!res.ok || !data.ok || !data.comment) {
        setError(data.error ?? "Failed to post comment");
        return;
      }
      setComments((prev) => [...prev, data.comment!]);
      setBody("");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded border border-zinc-200 bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold">Comments</h2>
      <p className="mb-4 text-xs text-zinc-500">
        Append-only thread. Request changes / reject notes appear here automatically.
      </p>

      {loading ? <p className="text-sm text-zinc-500">Loading…</p> : null}
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

      {!loading && comments.length === 0 ? (
        <p className="mb-4 text-sm text-zinc-500">No comments yet.</p>
      ) : null}

      <ul className="mb-4 flex flex-col gap-3">
        {comments.map((c) => {
          const badge = kindLabel(c.kind);
          const who = c.authorDisplayName || c.authorEmail || "Unknown";
          const when = new Date(c.createdAt).toLocaleString();
          return (
            <li key={c.id} className="rounded border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                <span className="font-medium text-zinc-700">{who}</span>
                <span>{when}</span>
                {badge ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">{badge}</span>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-zinc-900">{c.body}</p>
            </li>
          );
        })}
      </ul>

      {canComment ? (
        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            placeholder="Add a comment…"
            className="w-full rounded border px-3 py-2 text-sm"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="w-fit rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {pending ? "Posting…" : "Post comment"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-zinc-500">
          Only the author, Reviewer, or Super Admin can comment on this item.
        </p>
      )}
    </section>
  );
}
