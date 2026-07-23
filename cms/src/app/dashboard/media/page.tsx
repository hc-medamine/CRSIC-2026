import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canAccessMediaBucket, listMediaForUser } from "@/lib/media/store";
import { MEDIA_BUCKETS, type MediaBucket } from "@/lib/media/config";
import { MediaLibraryClient } from "./media-library-client";

export default async function MediaLibraryPage() {
  const user = await requireUser();
  if (user.role !== "super_admin") {
    redirect("/dashboard");
  }

  const bucketFlags = await Promise.all(
    MEDIA_BUCKETS.map(async (bucket) => [bucket, await canAccessMediaBucket(user, bucket)] as const),
  );
  const allowedBuckets = bucketFlags
    .filter(([, ok]) => ok)
    .map(([bucket]) => bucket) as MediaBucket[];

  if (allowedBuckets.length === 0) {
    redirect("/dashboard");
  }

  const assets = await listMediaForUser(user, 100);
  const items = assets.map((r) => ({
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
            same URL. Super Admin maintenance library — editors upload from article forms.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm underline">
          ← Home
        </Link>
      </header>

      <MediaLibraryClient initialItems={items} allowedBuckets={allowedBuckets} />
    </main>
  );
}
