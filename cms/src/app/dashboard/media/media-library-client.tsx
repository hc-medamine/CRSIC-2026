"use client";

import { useState } from "react";
import { MediaUploadField } from "@/app/dashboard/media-upload-field";
import type { MediaBucket } from "@/lib/media/config";

type Item = {
  id: string;
  bucket: string;
  originalFilename: string;
  mimeType: string;
  byteSize: number;
  publicPath: string;
  createdAt: string;
};

type Props = { initialItems: Item[] };

export function MediaLibraryClient({ initialItems }: Props) {
  const [bucket, setBucket] = useState<MediaBucket>("news");
  const [items, setItems] = useState(initialItems);
  const [lastPath, setLastPath] = useState("");
  const [lastId, setLastId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="font-medium">Bucket</span>
          <select
            value={bucket}
            onChange={(e) => {
              setBucket(e.target.value as MediaBucket);
              setLastId(null);
              setLastPath("");
            }}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="news">news → img/cms/news/</option>
            <option value="events">events → img/cms/events/</option>
            <option value="covers">covers → img/cms/covers/</option>
          </select>
        </label>
        <MediaUploadField
          bucket={bucket}
          publicPath={lastPath}
          mediaId={lastId}
          imagesOnly={false}
          label="Upload image or PDF"
          onUploaded={({ publicPath, mediaId }) => {
            setLastPath(publicPath);
            setLastId(mediaId);
            setItems((prev) => [
              {
                id: mediaId,
                bucket,
                originalFilename: publicPath.split("/").pop() ?? publicPath,
                mimeType: publicPath.endsWith(".pdf") ? "application/pdf" : "image/*",
                byteSize: 0,
                publicPath,
                createdAt: new Date().toISOString(),
              },
              ...prev.filter((i) => i.id !== mediaId),
            ]);
          }}
        />
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
          No uploads yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border border-zinc-200 bg-white shadow-sm">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3 text-sm">
              <p className="font-medium">{item.originalFilename}</p>
              <p className="break-all text-xs text-zinc-500">
                {item.bucket} · {item.mimeType} · <code>{item.publicPath}</code>
              </p>
              <button
                type="button"
                className="mt-1 text-xs underline"
                onClick={() => {
                  setBucket(item.bucket as MediaBucket);
                  setLastId(item.id);
                  setLastPath(item.publicPath);
                }}
              >
                Select to replace (same URL)
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
