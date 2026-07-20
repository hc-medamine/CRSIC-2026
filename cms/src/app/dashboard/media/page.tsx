import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { MediaLibraryClient } from "./media-library-client";

export default async function MediaLibraryPage() {
  await requireUser();
  const result = await query<{
    id: string;
    bucket: string;
    original_filename: string;
    mime_type: string;
    byte_size: number;
    public_path: string;
    created_at: Date;
  }>(
    `SELECT id, bucket, original_filename, mime_type, byte_size, public_path, created_at
     FROM media_assets
     ORDER BY created_at DESC
     LIMIT 100`,
  );

  const items = result.rows.map((r) => ({
    id: r.id,
    bucket: r.bucket,
    originalFilename: r.original_filename,
    mimeType: r.mime_type,
    byteSize: r.byte_size,
    publicPath: r.public_path,
    createdAt: r.created_at.toISOString(),
  }));

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS · Media</p>
          <h1 className="text-2xl font-semibold text-zinc-900">Uploads</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Max 5 MB · JPEG / PNG / WebP / PDF · public paths under{" "}
            <code className="text-xs">img/cms/{"{news|events|covers}/"}</code>. Replace keeps the
            same URL.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm underline">
          ← Dashboard
        </Link>
      </header>

      <MediaLibraryClient initialItems={items} />
    </main>
  );
}
