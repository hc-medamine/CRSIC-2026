"use client";

import { useState } from "react";
import { cmsMediaSrc } from "@/lib/media/cms-src";
import { MediaLightbox } from "./media-lightbox";

/**
 * Read-only preview of the P1 public card fields, shown near the Publish button so the
 * reviewer sees exactly what will be written to the public JSON.
 */

type NewsPreview = {
  kind: "news";
  img: string;
  label: string;
  title: string;
  slug?: string;
  mediaCount?: number;
};
type EventPreview = {
  kind: "event";
  day: string;
  month: string;
  year: string;
  title: string;
  type: string;
  status: string;
  img?: string;
  slug?: string;
  mediaCount?: number;
};
type PublicationPreview = {
  kind: "publication";
  cover: string;
  title: string;
  type: string;
  dept: string;
  desc: string;
  slug?: string;
  mediaCount?: number;
};

type Props = NewsPreview | EventPreview | PublicationPreview;

function Thumb({
  path,
  alt,
  onOpen,
}: {
  path: string;
  alt: string;
  onOpen: (src: string) => void;
}) {
  const src = cmsMediaSrc(path);
  if (!path || !src) {
    return (
      <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-crs-bg text-[10px] text-crs-muted">
        no image
      </div>
    );
  }
  return (
    <button
      type="button"
      className="shrink-0 overflow-hidden rounded-xl ring-1 ring-crs-border"
      onClick={() => onOpen(src)}
      aria-label="Open image preview"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-24 w-24 object-cover" />
    </button>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-xs font-medium uppercase tracking-wide text-crs-muted">{label}: </span>
      <span dir="auto" className="text-crs-ink">
        {value || "—"}
      </span>
    </div>
  );
}

export function PublishPreview(props: Props) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  return (
    <section className="grid gap-3 rounded-2xl border border-crs-secondary/30 bg-crs-primary/5 p-4">
      <p className="text-sm font-medium text-crs-primary">Public card + detail preview</p>
      {props.slug ? <Field label="slug" value={props.slug} /> : null}
      {typeof props.mediaCount === "number" ? (
        <Field label="media" value={String(props.mediaCount)} />
      ) : null}

      {props.kind === "news" ? (
        <div className="flex gap-3">
          <Thumb path={props.img} alt={props.title} onOpen={setLightboxSrc} />
          <div className="grid gap-1">
            <Field label="label" value={props.label || "خبر"} />
            <Field label="title" value={props.title} />
          </div>
        </div>
      ) : null}

      {props.kind === "event" ? (
        <div className="flex gap-3">
          {props.img ? <Thumb path={props.img} alt={props.title} onOpen={setLightboxSrc} /> : null}
          <div className="grid gap-1">
            <Field label="date" value={`${props.day} ${props.month} ${props.year}`.trim()} />
            <Field label="title" value={props.title} />
            <Field label="type" value={props.type} />
            <Field label="status" value={props.status} />
          </div>
        </div>
      ) : null}

      {props.kind === "publication" ? (
        <div className="flex gap-3">
          <Thumb path={props.cover} alt={props.title} onOpen={setLightboxSrc} />
          <div className="grid gap-1">
            <Field label="title" value={props.title} />
            <Field label="type" value={props.type} />
            <Field label="dept" value={props.dept} />
            <Field label="desc" value={props.desc} />
          </div>
        </div>
      ) : null}

      <MediaLightbox src={lightboxSrc} alt="Public preview" onClose={() => setLightboxSrc(null)} />
    </section>
  );
}
