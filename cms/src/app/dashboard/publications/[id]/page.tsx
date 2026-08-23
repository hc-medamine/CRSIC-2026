import { redirect, notFound } from "next/navigation";
import { cookies } from "next/headers";
import { CMS_LANG_COOKIE, normalizeLang, t, localizedDisplayName } from "@/lib/i18n/labels";
import { requireUser } from "@/lib/auth/session";
import { getPublicationById } from "@/lib/content/publications";
import { canAccessContentType, canReview } from "@/lib/content/permissions";
import { canViewContentItem, getContentMeta } from "@/lib/content/revisions";
import { getMediaByPublicPath } from "@/lib/media/store";
import { listSelectableOrgUnits } from "@/lib/users";
import { getItemPeopleMeta } from "@/lib/content/people";
import { getReviewOwnerMeta } from "@/lib/content/delegation";
import { getEmergencyMeta } from "@/lib/content/emergency";
import { refreshUserFromDb } from "@/lib/content/ooo";
import { PublicationEditorForm } from "../publication-form";
import { RevisionHistory } from "@/app/dashboard/revision-history";
import { ReassignAuthor } from "@/app/dashboard/reassign-author";
import { CommentThread } from "@/app/dashboard/comment-thread";
import { ReviewOwnerPanel } from "@/app/dashboard/review-owner-panel";
import { EscalatePanel } from "@/app/dashboard/escalate-panel";
import { EmergencyPanel } from "@/app/dashboard/emergency-panel";
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

export default async function PublicationDetailPage({ params }: Props) {
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const sessionUser = await requireUser();
  const user = (await refreshUserFromDb(sessionUser.id)) ?? sessionUser;
  if (!(await canAccessContentType(user, "publication"))) redirect("/dashboard");
  const { id } = await params;
  const item = await getPublicationById(id);
  if (!item) notFound();
  const meta = await getContentMeta(id);
  if (!meta || !(await canViewContentItem(user, meta))) redirect("/dashboard");
  const people = await getItemPeopleMeta(id);
  const ownerMeta = await getReviewOwnerMeta(id);
  const emergencyMeta = await getEmergencyMeta(id);

  const orgs = await listSelectableOrgUnits(user, "publication", {
    keepOrgId: item.org_unit_id,
  });
  const isAuthor = item.created_by === user.id || user.role === "super_admin";
  const trueAuthor = item.created_by === user.id;
  const reviewer = canReview(user) && item.created_by !== user.id;
  const canManage = user.role === "super_admin" || user.role === "reviewer";
  const canReassign = canManage && ["draft", "changes_requested", "submitted"].includes(item.status);
  const canProposeOwner =
    canManage && ["draft", "changes_requested", "submitted"].includes(item.status);
  const canEscalate = trueAuthor || canReview(user);
  const eligibleEmergency = ["draft", "changes_requested", "submitted", "approved"].includes(
    item.status,
  );
  const canEmergencyPublish =
    user.role === "super_admin" && eligibleEmergency && !emergencyMeta.needsPostReview;
  const canPostReview = canManage && emergencyMeta.needsPostReview;
  const canConfirmOk = canPostReview && emergencyMeta.emergencyPublishedBy !== user.id;
  const media = item.image_path ? await getMediaByPublicPath(item.image_path) : null;

  return (
    <EditPageShell
      breadcrumbs={[
        { href: "/dashboard", label: t("home", lang) },
        { href: "/dashboard/publications", label: t("publications", lang) },
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

      <PublicationEditorForm
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
          bodyAr: item.body_ar ?? "",
          bodyEn: item.body_en ?? "",
          attachments: Array.isArray(item.attachments) ? item.attachments : [],
          publicSlug: item.public_slug,
          status: item.status,
          reviewNote: item.review_note,
          editor: personProp(people.editor),
          reviewer: personProp(people.reviewer),
          publisher: personProp(people.publisher),
          reviewOwner: personProp(people.reviewOwner),
          escalatedAt: ownerMeta.escalatedAt,
          needsPostReview: emergencyMeta.needsPostReview,
          metaTitleAr: item.meta_title_ar ?? "",
          metaTitleEn: item.meta_title_en ?? "",
          metaDescriptionAr: item.meta_description_ar ?? "",
          metaDescriptionEn: item.meta_description_en ?? "",
          ogImage: item.og_image ?? "",
        }}
      />

      <EmergencyPanel
        contentItemId={item.id}
        canEmergencyPublish={canEmergencyPublish}
        canPostReview={canPostReview}
        canConfirmOk={canConfirmOk}
        needsPostReview={emergencyMeta.needsPostReview}
        emergencyReason={emergencyMeta.emergencyReason}
        emergencyPublishedAt={emergencyMeta.emergencyPublishedAt}
        emergencyPublishedByName={
          emergencyMeta.emergencyPublishedByName
            ? localizedDisplayName(
                {
                  displayName: emergencyMeta.emergencyPublishedByName,
                  nameAr: emergencyMeta.emergencyPublishedByNameAr,
                  nameEn: emergencyMeta.emergencyPublishedByNameEn,
                },
                lang,
              )
            : null
        }
      />

      <EscalatePanel
        contentItemId={item.id}
        canEscalate={canEscalate}
        escalatedAt={ownerMeta.escalatedAt}
      />

      <ReviewOwnerPanel
        contentItemId={item.id}
        canPropose={canProposeOwner}
        canConfirm={user.role === "super_admin"}
        reviewOwnerName={
          ownerMeta.reviewOwnerName
            ? localizedDisplayName(
                {
                  displayName: ownerMeta.reviewOwnerName,
                  nameAr: ownerMeta.reviewOwnerNameAr,
                  nameEn: ownerMeta.reviewOwnerNameEn,
                },
                lang,
              )
            : null
        }
        proposedOwnerName={
          ownerMeta.proposedOwnerName
            ? localizedDisplayName(
                {
                  displayName: ownerMeta.proposedOwnerName,
                  nameAr: ownerMeta.proposedOwnerNameAr,
                  nameEn: ownerMeta.proposedOwnerNameEn,
                },
                lang,
              )
            : null
        }
        proposedByName={
          ownerMeta.proposedByName
            ? localizedDisplayName(
                {
                  displayName: ownerMeta.proposedByName,
                  nameAr: ownerMeta.proposedByNameAr,
                  nameEn: ownerMeta.proposedByNameEn,
                },
                lang,
              )
            : null
        }
      />

      {canReassign ? (
        <ReassignAuthor
          contentItemId={item.id}
          contentType="publication"
          currentAuthorId={item.created_by}
        />
      ) : null}

      <CommentThread
        contentItemId={item.id}
        refreshToken={`${item.status}:${item.review_note ?? ""}:${item.updated_at.toISOString()}:${ownerMeta.escalatedAt ?? ""}:${emergencyMeta.needsPostReview}`}
      />

      <RevisionHistory contentItemId={item.id} contentType="publication" canRestore={canManage} />
    </EditPageShell>
  );
}
