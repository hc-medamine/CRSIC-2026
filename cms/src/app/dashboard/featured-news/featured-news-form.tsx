"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { FormBanner, FormSection, FormStickyActions, PublishButton } from "@/app/dashboard/form-ux";
import { t } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

const FEATURED_NEWS_MAX = 10;

type LiveNewsPick = {
  id: string;
  titleAr: string;
  slug: string;
  date: string;
};

type Initial = {
  draftIds: string[];
  liveIds: string[];
  publishedAt: string | null;
  updatedAt: string | null;
  usingFallback: boolean;
};

export function FeaturedNewsForm({
  initial,
  liveNews,
  canPublish,
}: {
  initial: Initial;
  liveNews: LiveNewsPick[];
  canPublish: boolean;
}) {
  const router = useRouter();
  const lang = useCmsLang();
  const [ids, setIds] = useState<string[]>(initial.draftIds);
  const [addId, setAddId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const byId = useMemo(() => new Map(liveNews.map((n) => [n.id, n])), [liveNews]);
  const selected = ids.map((id) => byId.get(id)).filter((n): n is LiveNewsPick => Boolean(n));
  const available = liveNews.filter((n) => !ids.includes(n.id));
  const atCap = selected.length >= FEATURED_NEWS_MAX;

  function move(from: number, to: number) {
    if (to < 0 || to >= ids.length) return;
    setIds((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      if (!item) return prev;
      next.splice(to, 0, item);
      return next;
    });
  }

  function addSelected() {
    if (!addId || atCap) {
      setError(atCap ? t("featuredNewsMax", lang) : t("featuredNewsPickOne", lang));
      return;
    }
    if (ids.includes(addId)) return;
    if (ids.length >= FEATURED_NEWS_MAX) {
      setError(t("featuredNewsMax", lang));
      return;
    }
    setIds((prev) => [...prev, addId]);
    setAddId("");
    setError(null);
  }

  function removeAt(index: number) {
    setIds((prev) => prev.filter((_, i) => i !== index));
  }

  async function run(action: "save" | "publish") {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      if (action === "save") {
        const res = await fetch("/api/featured-news", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", ids }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) throw new Error(data.error || t("featuredNewsSaveFailed", lang));
      } else {
        const saveRes = await fetch("/api/featured-news", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "save", ids }),
        });
        const saveData = (await saveRes.json()) as { ok?: boolean; error?: string };
        if (!saveRes.ok || !saveData.ok) {
          throw new Error(saveData.error || t("featuredNewsSaveFailed", lang));
        }
        const res = await fetch("/api/featured-news", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish" }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string };
        if (!res.ok || !data.ok) throw new Error(data.error || t("featuredNewsPublishFailed", lang));
      }
      const toast =
        action === "publish" ? t("featuredNewsPublished", lang) : t("featuredNewsSaved", lang);
      setMessage(toast);
      cmsToast(toast);
      router.refresh();
    } catch (err) {
      const text = err instanceof Error ? err.message : t("featuredNewsSaveFailed", lang);
      setError(text);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {initial.usingFallback ? (
        <FormBanner kind="info">{t("featuredNewsFallbackBanner", lang)}</FormBanner>
      ) : null}
      {error ? <FormBanner kind="error">{error}</FormBanner> : null}
      {message ? <FormBanner kind="success">{message}</FormBanner> : null}

      <FormSection step={1} title={t("featuredNewsPlaylist", lang)}>
        <p className="text-sm text-crs-muted">{t("featuredNewsHelp", lang)}</p>
        <p className="text-sm text-crs-muted">
          {t("featuredNewsCount", lang)
            .replace("{n}", String(selected.length))
            .replace("{max}", String(FEATURED_NEWS_MAX))}
        </p>

        <ol className="mt-3 flex flex-col gap-2">
          {selected.length === 0 ? (
            <li className="rounded-xl border border-dashed border-crs-border px-3 py-4 text-sm text-crs-muted">
              {t("featuredNewsEmpty", lang)}
            </li>
          ) : (
            selected.map((item, index) => (
              <li
                key={item.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex == null || dragIndex === index) return;
                  move(dragIndex, index);
                  setDragIndex(null);
                }}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-crs-border bg-crs-surface px-3 py-2"
              >
                <span className="w-6 shrink-0 text-xs text-crs-muted">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-crs-ink">{item.titleAr}</p>
                  <p className="truncate text-xs text-crs-muted">
                    {item.date} · {item.slug}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-crs-border px-2 text-sm disabled:opacity-40"
                    disabled={index === 0}
                    onClick={() => move(index, index - 1)}
                  >
                    {t("featuredNewsUp", lang)}
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-crs-border px-2 text-sm disabled:opacity-40"
                    disabled={index === selected.length - 1}
                    onClick={() => move(index, index + 1)}
                  >
                    {t("featuredNewsDown", lang)}
                  </button>
                  <button
                    type="button"
                    className="min-h-11 rounded-lg border border-red-200 px-2 text-sm text-red-800"
                    onClick={() => removeAt(index)}
                  >
                    {t("featuredNewsRemove", lang)}
                  </button>
                </div>
              </li>
            ))
          )}
        </ol>

        <div className="mt-4 flex flex-wrap items-end gap-2">
          <label className="min-w-[12rem] flex-1 text-sm">
            <span className="font-medium">{t("featuredNewsAdd", lang)}</span>
            <select
              value={addId}
              disabled={atCap || available.length === 0}
              onChange={(e) => setAddId(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            >
              <option value="">{t("featuredNewsPickOne", lang)}</option>
              {available.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.date ? `${item.date} — ` : ""}
                  {item.titleAr}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={atCap || !addId}
            className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
            onClick={addSelected}
          >
            {t("featuredNewsAddBtn", lang)}
          </button>
        </div>
      </FormSection>

      <p className="text-xs text-crs-muted">
        {initial.publishedAt
          ? `${t("featuredNewsLastPublished", lang)}: ${new Date(initial.publishedAt).toLocaleString()}`
          : t("featuredNewsNeverPublished", lang)}
      </p>

      <FormStickyActions>
        <div className="flex w-full flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            disabled={pending}
            className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
            onClick={() => void run("save")}
          >
            {t("actionSaveDraft", lang)}
          </button>
          {canPublish ? (
            <PublishButton
              pending={pending}
              onClick={() => void run("publish")}
              className="min-h-11 items-center rounded-xl bg-crs-primary px-4 py-2 text-sm font-medium text-white hover:bg-crs-secondary disabled:opacity-60"
            >
              {t("actionPublish", lang)}
            </PublishButton>
          ) : (
            <p className="text-sm text-crs-muted">{t("featuredNewsNeedsReview", lang)}</p>
          )}
        </div>
      </FormStickyActions>
    </div>
  );
}
