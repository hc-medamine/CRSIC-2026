import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getPublicSiteBaseForClient, resolvePreviewToken } from "@/lib/content/preview";
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

  const item = row.payload as Record<string, unknown>;
  const type = row.content_type;
  const expiresAt =
    row.expires_at instanceof Date ? row.expires_at.toISOString() : String(row.expires_at);
  const site = getPublicSiteBaseForClient();
  const spaUrl = site.baseUrl ? `${site.baseUrl}#preview/${token}` : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <nav className="flex flex-wrap items-center justify-between gap-3 text-sm text-crs-muted">
        <div>
          <Link href="/dashboard" className="text-crs-primary hover:underline">
            Home
          </Link>
          <span aria-hidden> / </span>
          <span className="text-crs-ink">Preview</span>
        </div>
        {spaUrl ? <SpaPreviewLink spaUrl={spaUrl} /> : null}
      </nav>

      <header className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">Candidate preview (not live public JSON)</p>
        <p className="mt-1 text-xs text-amber-900/80">
          Type: {type} · expires {expiresAt.slice(0, 19).replace("T", " ")} UTC
        </p>
      </header>

      <PreviewDetailClient type={type} item={item} />
    </main>
  );
}
