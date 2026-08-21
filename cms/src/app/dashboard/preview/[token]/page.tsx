import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getPublicSiteBaseForClient, resolvePreviewToken } from "@/lib/content/preview";
import { CMS_LANG_COOKIE, normalizeLang, t, tf } from "@/lib/i18n/labels";
import { AdminPageShell } from "@/app/dashboard/desk-ui";
import { PreviewDetailClient } from "./preview-detail-client";
import { SpaPreviewLink } from "./spa-preview-link";

type Params = { params: Promise<{ token: string }> };

/**
 * In-CMS A1 preview — works without serving the public SPA.
 * Token from POST /api/content/{id}/preview.
 */
export default async function DashboardPreviewPage({ params }: Params) {
  try {
    await requireUser();
  } catch {
    redirect("/login");
  }

  const { token } = await params;
  const row = await resolvePreviewToken(token);
  if (!row) notFound();

  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const item = row.payload as Record<string, unknown>;
  const type = row.content_type;
  const expiresAt =
    row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at);
  const site = getPublicSiteBaseForClient();
  const spaUrl = site.baseUrl ? `${site.baseUrl}#preview/${token}` : null;
  const when = expiresAt.slice(0, 19).replace("T", " ");

  return (
    <AdminPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { label: t("previewChrome", lang) },
      ]}
      title={t("previewChrome", lang)}
      subtitle={t("previewCandidate", lang)}
      wide={false}
      actions={spaUrl ? <SpaPreviewLink spaUrl={spaUrl} /> : null}
    >
      <header className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-[var(--crs-shadow-soft)]">
        <p className="font-medium">{t("previewCandidate", lang)}</p>
        <p className="mt-1 text-xs text-amber-900/80">
          {tf("previewMeta", lang, { type, when })}
        </p>
      </header>

      <PreviewDetailClient type={type} item={item} />
    </AdminPageShell>
  );
}
