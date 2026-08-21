import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import {
  canAccessMediaBucket,
  canManageMediaAsset,
  listMediaForUser,
  registerLegacyCoverFiles,
} from "@/lib/media/store";
import { mediaReplaceAffectsPublic } from "@/lib/media/replacePublic";
import { listMediaReferencesForPaths } from "@/lib/media/references";
import { MEDIA_BUCKETS, type MediaBucket } from "@/lib/media/config";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { AdminPageShell } from "@/app/dashboard/desk-ui";
import { MEDIA_LIBRARY_FETCH_LIMIT } from "@/lib/cms-limits";
import { MediaLibraryClient, type MediaLibraryItem } from "./media-library-client";

const SOURCE_PRIORITY = [
  "image_path",
  "attachments",
  "live_payload",
  "og_image",
  "revision",
] as const;

export default async function MediaLibraryPage() {
  const user = await requireUser();

  const bucketFlags = await Promise.all(
    MEDIA_BUCKETS.map(async (bucket) => [bucket, await canAccessMediaBucket(user, bucket)] as const),
  );
  const allowedBuckets = bucketFlags
    .filter(([, ok]) => ok)
    .map(([bucket]) => bucket) as MediaBucket[];

  if (allowedBuckets.length === 0) {
    redirect("/dashboard");
  }

  if (allowedBuckets.includes("covers")) {
    await registerLegacyCoverFiles(user.id);
  }

  const assets = await listMediaForUser(user, MEDIA_LIBRARY_FETCH_LIMIT);
  const refsByPath = await listMediaReferencesForPaths(assets.map((a) => a.public_path));

  const items: MediaLibraryItem[] = assets.map((r) => {
    const refs = refsByPath.get(r.public_path) ?? [];
    const primary =
      SOURCE_PRIORITY.map((s) => refs.find((ref) => ref.source === s)).find(Boolean) ?? refs[0] ?? null;
    const linkedItemIds = new Set(refs.map((ref) => ref.contentItemId));
    return {
      id: r.id,
      bucket: r.bucket,
      mimeType: r.mime_type,
      publicPath: r.public_path,
      updatedAt: (r.updated_at ?? r.created_at).toISOString(),
      uploaderNameAr: r.uploader_name_ar?.trim() || null,
      uploaderNameEn: r.uploader_name_en?.trim() || r.uploader_display_name?.trim() || null,
      linkedTitleAr: primary?.titleAr?.trim() || null,
      linkedHref: primary?.dashboardPath ?? null,
      linkedContentType: primary?.contentType ?? null,
      linkedCount: linkedItemIds.size,
      canManage: canManageMediaAsset(user, r),
      liveOnPublic: mediaReplaceAffectsPublic(refs),
    };
  });

  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <AdminPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("media", lang) },
      ]}
      title={t("media", lang)}
      subtitle={t("mediaLibraryHint", lang)}
    >
      <MediaLibraryClient
        initialItems={items}
        allowedBuckets={allowedBuckets}
        fetchLimit={MEDIA_LIBRARY_FETCH_LIMIT}
      />
    </AdminPageShell>
  );
}
