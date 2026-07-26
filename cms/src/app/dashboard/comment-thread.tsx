"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { formatDateTime } from "@/lib/format-datetime";
import { t, localizedDisplayName, type CmsLang } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

type Comment = {
  id: string;
  body: string;
  kind: "general" | "changes_requested" | "rejected";
  createdAt: string;
  authorEmail: string | null;
  authorDisplayName: string | null;
  authorNameAr: string | null;
  authorNameEn: string | null;
};

type Props = {
  contentItemId: string;
  /** Bump when parent refreshes after workflow actions so the thread reloads. */
  refreshToken?: string;
};

function kindLabel(kind: Comment["kind"], lang: CmsLang): string | null {
  if (kind === "changes_requested") return t("badgeChangesRequested", lang);
  if (kind === "rejected") return t("badgeRejected", lang);
  return null;
}

export function CommentThread({ contentItemId, refreshToken }: Props) {
  const lang = useCmsLang();
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
        const msg = data.error ?? t("commentsLoadFailed", lang);
        setError(msg);
        cmsToast.error(msg);
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
        const msg = data.error ?? t("commentsPostFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      setComments((prev) => [...prev, data.comment!]);
      setBody("");
      cmsToast.success(t("commentsPosted", lang));
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded border border-crs-border bg-white p-4">
      <h2 className="mb-3 text-lg font-semibold">{t("commentsTitle", lang)}</h2>
      <p className="mb-4 text-xs text-crs-muted">{t("commentsHint", lang)}</p>

      {loading ? <p className="text-sm text-crs-muted">{t("loadingEllipsis", lang)}</p> : null}
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}

      {!loading && comments.length === 0 ? (
        <p className="mb-4 text-sm text-crs-muted">{t("noComments", lang)}</p>
      ) : null}

      <ul className="mb-4 flex flex-col gap-3">
        {comments.map((c) => {
          const badge = kindLabel(c.kind, lang);
          const who =
            localizedDisplayName(
              {
                displayName: c.authorDisplayName,
                nameAr: c.authorNameAr,
                nameEn: c.authorNameEn,
              },
              lang,
            ) ||
            c.authorEmail ||
            t("commentsUnknownAuthor", lang);
          const when = formatDateTime(c.createdAt);
          return (
            <li key={c.id} className="rounded border border-crs-border/70 bg-crs-bg px-3 py-2 text-sm">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-crs-muted">
                <span className="font-medium text-crs-ink/90">{who}</span>
                <span>{when}</span>
                {badge ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-900">{badge}</span>
                ) : null}
              </div>
              <p className="whitespace-pre-wrap text-crs-ink">{c.body}</p>
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
            placeholder={t("addCommentPh", lang)}
            className="w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="w-fit rounded-lg bg-crs-primary hover:bg-crs-secondary px-3 py-1.5 text-sm text-white disabled:opacity-50"
          >
            {pending ? t("posting", lang) : t("postComment", lang)}
          </button>
        </form>
      ) : (
        <p className="text-xs text-crs-muted">{t("commentsOnlyAuthorReviewer", lang)}</p>
      )}
    </section>
  );
}
