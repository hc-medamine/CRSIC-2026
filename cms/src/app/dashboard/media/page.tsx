import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { canAccessMediaBucket, listMediaForUser } from "@/lib/media/store";
import { MEDIA_BUCKETS, type MediaBucket } from "@/lib/media/config";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { PageBreadcrumb } from "@/app/dashboard/ui-bits";
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
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <PageBreadcrumb
        items={[
          { href: "/dashboard", label: t("home", lang) },
          { label: t("media", lang) },
        ]}
      />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">{t("media", lang)}</h1>
        <p className="mt-1 text-sm text-crs-muted">
          Max 5 MB · JPEG / PNG / WebP / PDF · paths under{" "}
          <code className="text-xs">img/cms/{"{news|events|covers}/"}</code>
        </p>
      </header>

      <MediaLibraryClient initialItems={items} allowedBuckets={allowedBuckets} />
    </main>
  );
}
