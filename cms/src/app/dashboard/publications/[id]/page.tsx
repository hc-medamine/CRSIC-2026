import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getPublicationById } from "@/lib/content/publications";
import { canAccessContentType, canReview, getUserOrgIds } from "@/lib/content/permissions";
import { getMediaByPublicPath } from "@/lib/media/store";
import { listOrgUnits } from "@/lib/users";
import { PublicationEditorForm } from "../publication-form";

type Props = { params: Promise<{ id: string }> };

export default async function PublicationDetailPage({ params }: Props) {
  const user = await requireUser();
  if (!(await canAccessContentType(user, "publication"))) redirect("/dashboard");
  const { id } = await params;
  const item = await getPublicationById(id);
  if (!item) notFound();

  const allOrgs = await listOrgUnits();
  const orgIds =
    user.role === "super_admin" || user.role === "reviewer"
      ? allOrgs.map((o) => o.id)
      : await getUserOrgIds(user.id);
  const orgs = allOrgs.filter((o) => orgIds.includes(o.id));
  const isAuthor = item.created_by === user.id || user.role === "super_admin";
  const reviewer = canReview(user) && item.created_by !== user.id;
  const media = item.image_path ? await getMediaByPublicPath(item.image_path) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">Publications</p>
          <h1 className="text-2xl font-semibold">Edit / review</h1>
        </div>
        <Link href="/dashboard/publications" className="text-sm underline">
          ← Back
        </Link>
      </header>

      {!reviewer && canReview(user) && item.created_by === user.id ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Four-eyes: you authored this item, so you cannot approve or publish it. Use a different
          Reviewer account.
        </p>
      ) : null}

      <PublicationEditorForm
        mode="edit"
        orgUnits={orgs}
        isAuthor={isAuthor}
        canSubmit={isAuthor && ["draft", "changes_requested"].includes(item.status)}
        canReview={reviewer}
        initial={{
          id: item.id,
          orgUnitId: item.org_unit_id,
          titleAr: item.title_ar,
          titleEn: item.title_en ?? "",
          deptAr: item.label_ar ?? "",
          deptEn: item.label_en ?? "",
          descAr: item.summary_ar ?? "",
          descEn: item.summary_en ?? "",
          coverPath: item.image_path ?? "",
          coverMediaId: media?.id ?? null,
          imageAltAr: item.image_alt_ar ?? "",
          imageAltEn: item.image_alt_en ?? "",
          enStatus: item.en_status,
          pubKind: item.pub_kind ?? "collective",
          status: item.status,
          reviewNote: item.review_note,
        }}
      />
    </main>
  );
}
