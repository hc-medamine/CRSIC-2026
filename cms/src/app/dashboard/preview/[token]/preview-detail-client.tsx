"use client";

import { useState } from "react";
import { cmsMediaSrc } from "@/lib/media/cms-src";
import { MediaLightbox } from "@/app/dashboard/media-lightbox";

type Props = {
  type: string;
  item: Record<string, unknown>;
};

function asString(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function mediaList(item: Record<string, unknown>, fallbackPath: string): { kind: string; src: string }[] {
  const raw = item.media;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map((m) => {
        if (!m || typeof m !== "object") return null;
        const row = m as { kind?: string; src?: string };
        if (!row.src) return null;
        return { kind: row.kind === "pdf" ? "pdf" : "image", src: row.src };
      })
      .filter((x): x is { kind: string; src: string } => Boolean(x));
  }
  if (fallbackPath) return [{ kind: "image", src: fallbackPath }];
  return [];
}

export function PreviewDetailClient({ type, item }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const title =
    type === "publication"
      ? asString(item.t || item.title)
      : asString(item.title);
  const summary =
    type === "publication"
      ? asString(item.summary || item.desc)
      : asString(item.summary);
  const body = asString(item.body);
  const label =
    type === "news"
      ? asString(item.label)
      : type === "event"
        ? [asString(item.type), [asString(item.day), asString(item.month), asString(item.year)].filter(Boolean).join(" ")]
            .filter(Boolean)
            .join(" · ")
        : [asString(item.dept), asString(item.type)].filter(Boolean).join(" · ");

  const coverPath =
    type === "publication"
      ? asString(item.cover || item.img)
      : asString(item.img);
  const media = mediaList(item, coverPath);
  const hero = media.find((m) => m.kind === "image") ?? null;
  const heroSrc = hero ? cmsMediaSrc(hero.src) : null;

  return (
    <article className="overflow-hidden rounded-2xl border border-crs-border bg-crs-surface shadow-sm">
      {heroSrc ? (
        <button
          type="button"
          className="block w-full bg-crs-bg"
          onClick={() => setLightbox(heroSrc)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={heroSrc}
            alt=""
            className="mx-auto max-h-96 w-auto max-w-full object-contain"
          />
        </button>
      ) : hero ? (
        <div className="flex h-40 items-center justify-center bg-crs-bg px-4 text-center text-xs text-crs-muted">
          Cover path present but file could not be loaded:{" "}
          <code className="ms-1">{hero.src}</code>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 p-6">
        {label ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-crs-primary">{label}</p>
        ) : null}
        <h1 className="text-2xl font-semibold text-crs-ink" dir="auto">
          {title || "(untitled)"}
        </h1>
        {summary ? (
          <p className="text-sm leading-relaxed text-crs-muted" dir="auto">
            {summary}
          </p>
        ) : null}
        {body ? (
          <div
            className="prose prose-sm max-w-none text-crs-ink [&_a]:text-crs-primary"
            dir="auto"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <p className="text-sm text-crs-muted">No body content in this candidate.</p>
        )}

        {media.length > 1 ? (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {media.slice(1).map((m, i) => {
              if (m.kind === "pdf") {
                return (
                  <li
                    key={`${m.src}-${i}`}
                    className="flex h-20 items-center justify-center rounded-xl bg-crs-bg text-xs font-semibold text-crs-muted"
                  >
                    PDF
                  </li>
                );
              }
              const src = cmsMediaSrc(m.src);
              if (!src) return null;
              return (
                <li key={`${m.src}-${i}`}>
                  <button
                    type="button"
                    className="overflow-hidden rounded-xl ring-1 ring-crs-border"
                    onClick={() => setLightbox(src)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="h-20 w-full object-cover" />
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>

      <MediaLightbox src={lightbox} alt={title} onClose={() => setLightbox(null)} />
    </article>
  );
}
