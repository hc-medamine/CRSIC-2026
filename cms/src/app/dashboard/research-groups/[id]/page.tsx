import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getResearchGroupById } from "@/lib/content/researchGroups";
import { normalizeResearchMembers } from "@/lib/publish/researchGroupsJson";
import { canAccessContentType, canReview } from "@/lib/content/permissions";
import { canViewContentItem, getContentMeta } from "@/lib/content/revisions";
import { listSelectableOrgUnits } from "@/lib/users";
import { getItemPeopleMeta } from "@/lib/content/people";
import { refreshUserFromDb } from "@/lib/content/ooo";
import { ResearchGroupForm } from "../group-form";
import { RevisionHistory } from "@/app/dashboard/revision-history";
import { ReassignAuthor } from "@/app/dashboard/reassign-author";
import { CommentThread } from "@/app/dashboard/comment-thread";

type Props = { params: Promise<{ id: string }> };

function personProp(p: { displayName: string; email: string; role: string } | null) {
  if (!p) return null;
  return { displayName: p.displayName, email: p.email, role: p.role };
}

export default async function ResearchGroupDetailPage({ params }: Props) {
  const sessionUser = await requireUser();
  const user = (await refreshUserFromDb(sessionUser.id)) ?? sessionUser;
  if (!(await canAccessContentType(user, "research_group"))) redirect("/dashboard");
  const { id } = await params;
  const item = await getResearchGroupById(id);
  if (!item) notFound();
  const meta = await getContentMeta(id);
  if (!meta || !(await canViewContentItem(user, meta))) redirect("/dashboard");
  const people = await getItemPeopleMeta(id);

  const orgs = await listSelectableOrgUnits(user, "research_group", { keepOrgId: item.org_unit_id });
  const isAuthor = item.created_by === user.id || user.role === "super_admin";
  const reviewer = canReview(user) && item.created_by !== user.id;
  const canManage = user.role === "super_admin" || user.role === "reviewer";
  const canReassign = canManage && ["draft", "changes_requested", "submitted"].includes(item.status);

  const members = normalizeResearchMembers(item.research_members).map((m) => ({
    nameAr: m.name_ar,
    nameEn: m.name_en ?? "",
  }));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <header className="flex items-center justify-between border-b border-crs-border pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-crs-muted">Research groups</p>
          <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">Edit / review</h1>
        </div>
        <Link href="/dashboard/research-groups" className="inline-flex min-h-11 items-center text-sm text-crs-primary hover:underline">
          Back
        </Link>
      </header>

      {!reviewer && canReview(user) && item.created_by === user.id ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Four-eyes: you authored this item, so you cannot approve or publish it. Use a different Reviewer account.
        </p>
      ) : null}

      <ResearchGroupForm
        mode="edit"
        orgUnits={orgs}
        isAuthor={isAuthor}
        canSubmit={isAuthor && ["draft", "changes_requested"].includes(item.status)}
        canReview={reviewer}
        canDelete={user.role === "super_admin"}
        initial={{
          id: item.id,
          orgUnitId: item.org_unit_id,
          titleAr: item.title_ar,
          titleEn: item.title_en ?? "",
          summaryAr: item.summary_ar ?? "",
          summaryEn: item.summary_en ?? "",
          leadAr: item.research_lead_ar ?? "",
          leadEn: item.research_lead_en ?? "",
          members,
          enStatus: item.en_status,
          status: item.status,
          reviewNote: item.review_note,
          editor: personProp(people.editor),
          reviewer: personProp(people.reviewer),
          publisher: personProp(people.publisher),
          metaTitleAr: item.meta_title_ar ?? "",
          metaTitleEn: item.meta_title_en ?? "",
          metaDescriptionAr: item.meta_description_ar ?? "",
          metaDescriptionEn: item.meta_description_en ?? "",
          ogImage: item.og_image ?? "",
        }}
      />

      {canReassign ? (
        <ReassignAuthor
          contentItemId={item.id}
          contentType="research_group"
          currentAuthorId={item.created_by}
        />
      ) : null}

      <CommentThread
        contentItemId={item.id}
        refreshToken={`${item.status}:${item.review_note ?? ""}:${item.updated_at.toISOString()}`}
      />

      <RevisionHistory contentItemId={item.id} contentType="research_group" canRestore={canManage} />
    </main>
  );
}
