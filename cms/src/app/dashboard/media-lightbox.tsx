"use client";

import { useEffect } from "react";

type Props = {
  src: string | null;
  alt?: string;
  onClose: () => void;
};

/** Simple full-screen image lightbox (shadowbox). */
export function MediaLightbox({ src, alt = "", onClose }: Props) {
  useEffect(() => {
    if (!src) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-crs-ink/80 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute end-4 top-4 min-h-11 rounded-xl border border-white/30 bg-white/10 px-4 text-sm text-white hover:bg-white/20"
        onClick={onClose}
      >
        Close
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
