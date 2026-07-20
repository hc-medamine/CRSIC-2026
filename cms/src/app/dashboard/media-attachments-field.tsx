"use client";

import { useRef, useState } from "react";
import type { MediaBucket } from "@/lib/media/config";
import type { PublicMediaItem } from "@/lib/publish/media";

type Props = {
  bucket: MediaBucket;
  items: PublicMediaItem[];
  disabled?: boolean;
  onChange: (items: PublicMediaItem[]) => void;
};

export function MediaAttachmentsField({ bucket, items, disabled, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChange(file: File | null) {
    if (!file || disabled) return;
    setPending(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("bucket", bucket);
      const res = await fetch("/api/media", { method: "POST", body: form });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        asset?: { publicPath: string; mimeType?: string };
      };
      if (!res.ok || !data.ok || !data.asset) {
        setError(data.error ?? "Upload failed");
        return;
      }
      const kind: PublicMediaItem["kind"] =
        file.type === "application/pdf" || data.asset.publicPath.toLowerCase().endsWith(".pdf")
          ? "pdf"
          : "image";
      onChange([...items, { kind, src: data.asset.publicPath }]);
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const j = index + dir;
    if (j < 0 || j >= next.length) return;
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  }

  return (
    <div className="grid gap-2 rounded border border-zinc-200 bg-zinc-50 p-3 text-sm">
      <p className="font-medium">Attachments (images + PDFs)</p>
      <p className="text-xs text-zinc-500">
        First image is the public card cover. Max 5 MB each · JPEG / PNG / WebP / PDF.
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-zinc-500">No attachments yet.</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item, i) => (
            <li
              key={`${item.src}-${i}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-200 bg-white px-2 py-1.5"
            >
              <span className="break-all text-xs">
                <span className="uppercase text-zinc-400">{item.kind}</span> · {item.src}
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  disabled={disabled || i === 0}
                  className="rounded border px-2 py-0.5 text-xs"
                  onClick={() => move(i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={disabled || i === items.length - 1}
                  className="rounded border px-2 py-0.5 text-xs"
                  onClick={() => move(i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-700"
                  onClick={() => removeAt(i)}
                >
                  Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf"
        disabled={disabled || pending}
        onChange={(e) => void onFileChange(e.target.files?.[0] ?? null)}
        className="text-xs"
      />
      {pending ? <p className="text-xs text-zinc-500">Uploading…</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
