import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { getPartnerById } from "@/lib/content/partners";
import { canAccessContentType, canReview } from "@/lib/content/permissions";
import { canSubmitStatus } from "@/lib/content/reviewWorkflow";
import { canRecycleFromEditPageAsync } from "@/lib/content/recycleBin";
import { canViewContentItem, getContentMeta } from "@/lib/content/revisions";
import { listSelectableOrgUnits } from "@/lib/users";
import { getItemPeopleMeta } from "@/lib/content/people";
import { refreshUserFromDb } from "@/lib/content/ooo";
import { PartnerEditorForm } from "../partner-form";
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

export default async function PartnerDetailPage({ params }: Props) {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const sessionUser = await requireUser();
  const user = (await refreshUserFromDb(sessionUser.id)) ?? sessionUser;
  if (!(await canAccessContentType(user, "partner"))) redirect("/dashboard");
  const { id } = await params;
  const item = await getPartnerById(id);
  if (!item) notFound();
  const meta = await getContentMeta(id);
  if (!meta || !(await canViewContentItem(user, meta))) redirect("/dashboard");
  const people = await getItemPeopleMeta(id);

  const orgs = await listSelectableOrgUnits(user, "partner", { keepOrgId: item.org_unit_id });
  const isAuthor = item.created_by === user.id || user.role === "super_admin";
  const reviewer = canReview(user) && item.created_by !== user.id;
  const canManage = user.role === "super_admin" || user.role === "reviewer";
  const canReassign = canManage && ["draft", "changes_requested", "submitted"].includes(item.status);
  const canDelete = await canRecycleFromEditPageAsync(user, item);

  return (
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { href: "/dashboard/partners", label: t("partners", lang) },
        { label: t("edit", lang) },
      ]}
      title={t("editReview", lang)}
      subtitle={item.title_ar || undefined}
      wide
      cloneItemId={item.id}
    >

      {!reviewer && canReview(user) && item.created_by === user.id ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("fourEyesNotice", lang)}
        </p>
      ) : null}

      <PartnerEditorForm
        mode="edit"
        orgUnits={orgs}
        isAuthor={isAuthor}
        canSubmit={isAuthor && canSubmitStatus(item.status)}
        canReview={reviewer}
        canDelete={canDelete}
        initial={{
          id: item.id,
          orgUnitId: item.org_unit_id,
          titleAr: item.title_ar,
          titleEn: item.title_en ?? "",
          labelAr: item.label_ar ?? "",
          labelEn: item.label_en ?? "",
          enStatus: item.en_status,
          partnerScope: item.partner_scope ?? "nat",
          partnerDate: item.partner_date ?? "",
          partnerEmoji: item.partner_emoji ?? "",
          summaryAr: item.summary_ar ?? "",
          summaryEn: item.summary_en ?? "",
          bodyAr: item.body_ar ?? "",
          bodyEn: item.body_en ?? "",
          imagePath: item.image_path ?? "",
          imageCardPath: item.image_card_path ?? "",
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
          contentType="partner"
          currentAuthorId={item.created_by}
        />
      ) : null}

      <CommentThread
        contentItemId={item.id}
        refreshToken={`${item.status}:${item.review_note ?? ""}:${item.updated_at.toISOString()}`}
      />

      <RevisionHistory contentItemId={item.id} contentType="partner" canRestore={canManage} />
    </EditPageShell>
  );
}
