"use client";

import { useRef, useState } from "react";
import { t } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

type Crop = { x: number; y: number; w: number; h: number };

export function ImageCropModal({
  src,
  onCancel,
  onApply,
}: {
  src: string;
  onCancel: () => void;
  onApply: (crop: Crop) => void;
}) {
  const lang = useCmsLang();
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [nat, setNat] = useState({ w: 1, h: 1 });
  const drag = useRef<{ cx: number; cy: number } | null>(null);

  function naturalCrop(clientX: number, clientY: number, start?: { cx: number; cy: number }): Crop | null {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const toLocal = (cx: number, cy: number) => ({
      x: Math.min(Math.max(0, cx - rect.left), rect.width),
      y: Math.min(Math.max(0, cy - rect.top), rect.height),
    });
    const a = toLocal(start?.cx ?? clientX, start?.cy ?? clientY);
    const b = toLocal(clientX, clientY);
    const left = Math.min(a.x, b.x);
    const top = Math.min(a.y, b.y);
    const w = Math.max(8, Math.abs(b.x - a.x));
    const h = Math.max(8, Math.abs(b.y - a.y));
    return {
      x: Math.round(left * scaleX),
      y: Math.round(top * scaleY),
      w: Math.round(w * scaleX),
      h: Math.round(h * scaleY),
    };
  }

  const display = crop
    ? {
        left: (crop.x / nat.w) * 100,
        top: (crop.y / nat.h) * 100,
        width: (crop.w / nat.w) * 100,
        height: (crop.h / nat.h) * 100,
      }
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-crs-border bg-crs-surface p-5 shadow-lg">
        <p className="text-sm text-crs-muted">{t("cropHint", lang)}</p>
        <div
          className="relative mt-3 inline-block max-h-[60vh] cursor-crosshair overflow-hidden"
          onMouseDown={(e) => {
            drag.current = { cx: e.clientX, cy: e.clientY };
            const next = naturalCrop(e.clientX, e.clientY);
            if (next) setCrop(next);
          }}
          onMouseMove={(e) => {
            if (!drag.current) return;
            const next = naturalCrop(e.clientX, e.clientY, drag.current);
            if (next) setCrop(next);
          }}
          onMouseUp={() => {
            drag.current = null;
          }}
          onMouseLeave={() => {
            drag.current = null;
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt=""
            className="max-h-[60vh] max-w-full"
            onLoad={(e) => {
              setNat({
                w: Math.max(1, e.currentTarget.naturalWidth),
                h: Math.max(1, e.currentTarget.naturalHeight),
              });
              setCrop(null);
            }}
          />
          {display ? (
            <span
              className="pointer-events-none absolute border-2 border-crs-primary bg-crs-primary/10"
              style={{
                left: `${display.left}%`,
                top: `${display.top}%`,
                width: `${display.width}%`,
                height: `${display.height}%`,
              }}
            />
          ) : null}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-xl border border-crs-border px-3 py-2 text-sm" onClick={onCancel}>
            {t("actionCancel", lang)}
          </button>
          <button
            type="button"
            className="rounded-xl bg-crs-primary px-3 py-2 text-sm text-white disabled:opacity-50"
            disabled={!crop}
            onClick={() => crop && onApply(crop)}
          >
            {t("cropApply", lang)}
          </button>
        </div>
      </div>
    </div>
  );
}
