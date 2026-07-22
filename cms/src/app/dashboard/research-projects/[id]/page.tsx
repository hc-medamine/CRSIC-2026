import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getResearchProjectById } from "@/lib/content/researchProjects";
import { getResearchGroupById } from "@/lib/content/researchGroups";
import { normalizeResearchEntries } from "@/lib/publish/researchProjectsJson";
import { canAccessContentType, canReview } from "@/lib/content/permissions";
import { canViewContentItem, getContentMeta } from "@/lib/content/revisions";
import { listSelectableOrgUnits } from "@/lib/users";
import { getItemPeopleMeta } from "@/lib/content/people";
import { refreshUserFromDb } from "@/lib/content/ooo";
import { ResearchProjectForm } from "../project-form";
import { RevisionHistory } from "@/app/dashboard/revision-history";
import { ReassignAuthor } from "@/app/dashboard/reassign-author";
import { CommentThread } from "@/app/dashboard/comment-thread";

type Props = { params: Promise<{ id: string }> };

function personProp(p: { displayName: string; email: string; role: string } | null) {
  if (!p) return null;
  return { displayName: p.displayName, email: p.email, role: p.role };
}

export default async function ResearchProjectDetailPage({ params }: Props) {
  const sessionUser = await requireUser();
  const user = (await refreshUserFromDb(sessionUser.id)) ?? sessionUser;
  if (!(await canAccessContentType(user, "research_project"))) redirect("/dashboard");
  const { id } = await params;
  const item = await getResearchProjectById(id);
  if (!item) notFound();
  const meta = await getContentMeta(id);
  if (!meta || !(await canViewContentItem(user, meta))) redirect("/dashboard");
  const people = await getItemPeopleMeta(id);

  const orgs = await listSelectableOrgUnits(user, "research_project", { keepOrgId: item.org_unit_id });
  const currentGroup = item.research_group_id ? await getResearchGroupById(item.research_group_id) : null;
  const isAuthor = item.created_by === user.id || user.role === "super_admin";
  const reviewer = canReview(user) && item.created_by !== user.id;
  const canManage = user.role === "super_admin" || user.role === "reviewer";
  const canReassign = canManage && ["draft", "changes_requested", "submitted"].includes(item.status);

  const axes = normalizeResearchEntries(item.research_axes).map((a) => ({ ar: a.ar, en: a.en ?? "" }));
  const impacts = normalizeResearchEntries(item.research_impacts).map((i) => ({ ar: i.ar, en: i.en ?? "" }));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">Research projects</p>
          <h1 className="text-2xl font-semibold">Edit / review</h1>
        </div>
        <Link href="/dashboard/research-projects" className="text-sm underline">
          ← Back
        </Link>
      </header>

      {!reviewer && canReview(user) && item.created_by === user.id ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Four-eyes: you authored this item, so you cannot approve or publish it. Use a different Reviewer account.
        </p>
      ) : null}

      <ResearchProjectForm
        mode="edit"
        orgUnits={orgs}
        isAuthor={isAuthor}
        canSubmit={isAuthor && ["draft", "changes_requested"].includes(item.status)}
        canReview={reviewer}
        canDelete={user.role === "super_admin"}
        initialGroupOption={
          currentGroup
            ? { id: currentGroup.id, title_ar: currentGroup.title_ar, title_en: currentGroup.title_en }
            : null
        }
        initial={{
          id: item.id,
          orgUnitId: item.org_unit_id,
          researchGroupId: item.research_group_id ?? "",
          titleAr: item.title_ar,
          titleEn: item.title_en ?? "",
          leadAr: item.research_lead_ar ?? "",
          leadEn: item.research_lead_en ?? "",
          bodyAr: item.body_ar ?? "",
          bodyEn: item.body_en ?? "",
          questionsAr: item.research_questions_ar ?? "",
          questionsEn: item.research_questions_en ?? "",
          axes,
          durationAr: item.research_duration_ar ?? "",
          durationEn: item.research_duration_en ?? "",
          impacts,
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
          contentType="research_project"
          currentAuthorId={item.created_by}
        />
      ) : null}

      <CommentThread
        contentItemId={item.id}
        refreshToken={`${item.status}:${item.review_note ?? ""}:${item.updated_at.toISOString()}`}
      />

      <RevisionHistory contentItemId={item.id} contentType="research_project" canRestore={canManage} />
    </main>
  );
}
