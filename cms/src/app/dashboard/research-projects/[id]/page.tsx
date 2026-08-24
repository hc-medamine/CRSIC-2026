import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { getResearchProjectById } from "@/lib/content/researchProjects";
import { getResearchGroupById } from "@/lib/content/researchGroups";
import { normalizeResearchEntries } from "@/lib/publish/researchProjectsJson";
import { canAccessContentType, canReview } from "@/lib/content/permissions";
import { canRecycleFromEditPage } from "@/lib/content/recycleBin";
import { canViewContentItem, getContentMeta } from "@/lib/content/revisions";
import { listSelectableOrgUnits } from "@/lib/users";
import { getItemPeopleMeta } from "@/lib/content/people";
import { refreshUserFromDb } from "@/lib/content/ooo";
import { ResearchProjectForm } from "../project-form";
import { RevisionHistory } from "@/app/dashboard/revision-history";
import { ReassignAuthor } from "@/app/dashboard/reassign-author";
import { CommentThread } from "@/app/dashboard/comment-thread";
import { EditPageShell } from "@/app/dashboard/content-list-page";

type Props = { params: Promise<{ id: string }> };

function personProp(
  p: {
    displayName: string;
    nameAr?: string | null;
    nameEn?: string | null;
    email: string;
    role: string;
  } | null,
) {
  if (!p) return null;
  return {
    displayName: p.displayName,
    nameAr: p.nameAr ?? null,
    nameEn: p.nameEn ?? null,
    email: p.email,
    role: p.role,
  };
}

export default async function ResearchProjectDetailPage({ params }: Props) {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
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
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { href: "/dashboard/research-projects", label: t("researchProjects", lang) },
        { label: t("edit", lang) },
      ]}
      title={t("editReview", lang)}
      subtitle={item.title_ar || undefined}
      wide
    >

      {!reviewer && canReview(user) && item.created_by === user.id ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("fourEyesNotice", lang)}
        </p>
      ) : null}

      <ResearchProjectForm
        mode="edit"
        orgUnits={orgs}
        isAuthor={isAuthor}
        canSubmit={isAuthor && ["draft", "changes_requested"].includes(item.status)}
        canReview={reviewer}
        canDelete={canRecycleFromEditPage(user, item)}
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
    </EditPageShell>
  );
}
