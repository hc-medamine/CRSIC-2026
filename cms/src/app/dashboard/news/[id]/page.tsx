import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getNewsById } from "@/lib/content/news";
import { canAccessContentType, canReview, getUserOrgIds } from "@/lib/content/permissions";
import { canViewContentItem, getContentMeta } from "@/lib/content/revisions";
import { getMediaByPublicPath } from "@/lib/media/store";
import { listOrgUnits } from "@/lib/users";
import { getItemPeopleMeta } from "@/lib/content/people";
import { getReviewOwnerMeta } from "@/lib/content/delegation";
import { refreshUserFromDb } from "@/lib/content/ooo";
import { NewsEditorForm } from "../news-form";
import { RevisionHistory } from "@/app/dashboard/revision-history";
import { ReassignAuthor } from "@/app/dashboard/reassign-author";
import { CommentThread } from "@/app/dashboard/comment-thread";
import { ReviewOwnerPanel } from "@/app/dashboard/review-owner-panel";
import { EscalatePanel } from "@/app/dashboard/escalate-panel";

type Props = { params: Promise<{ id: string }> };

function personProp(p: { displayName: string; email: string; role: string } | null) {
  if (!p) return null;
  return { displayName: p.displayName, email: p.email, role: p.role };
}

export default async function NewsDetailPage({ params }: Props) {
  const sessionUser = await requireUser();
  const user = (await refreshUserFromDb(sessionUser.id)) ?? sessionUser;
  if (!(await canAccessContentType(user, "news"))) redirect("/dashboard");

  const { id } = await params;
  const item = await getNewsById(id);
  if (!item) notFound();
  const meta = await getContentMeta(id);
  if (!meta || !(await canViewContentItem(user, meta))) redirect("/dashboard");
  const people = await getItemPeopleMeta(id);
  const ownerMeta = await getReviewOwnerMeta(id);

  const allOrgs = await listOrgUnits();
  const orgIds =
    user.role === "super_admin" || user.role === "reviewer"
      ? allOrgs.map((o) => o.id)
      : await getUserOrgIds(user.id);
  const orgs = allOrgs.filter((o) => orgIds.includes(o.id));

  const isAuthor = item.created_by === user.id || user.role === "super_admin";
  const trueAuthor = item.created_by === user.id;
  const reviewer = canReview(user) && item.created_by !== user.id;
  const canManage = user.role === "super_admin" || user.role === "reviewer";
  const canReassign = canManage && ["draft", "changes_requested", "submitted"].includes(item.status);
  const canProposeOwner =
    canManage && ["draft", "changes_requested", "submitted"].includes(item.status);
  const canEscalate = trueAuthor || canReview(user);
  const media = item.image_path ? await getMediaByPublicPath(item.image_path) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex items-center justify-between border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">News</p>
          <h1 className="text-2xl font-semibold">Edit / review</h1>
        </div>
        <Link href="/dashboard/news" className="text-sm underline">
          ← Back
        </Link>
      </header>

      {!reviewer && canReview(user) && item.created_by === user.id ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Four-eyes: you authored this item, so you cannot approve or publish it. Use a different
          Reviewer account.
        </p>
      ) : null}

      <NewsEditorForm
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
          labelAr: item.label_ar ?? "",
          labelEn: item.label_en ?? "",
          summaryAr: item.summary_ar ?? "",
          summaryEn: item.summary_en ?? "",
          bodyAr: item.body_ar ?? "",
          bodyEn: item.body_en ?? "",
          imagePath: item.image_path ?? "",
          imageMediaId: media?.id ?? null,
          imageAltAr: item.image_alt_ar ?? "",
          imageAltEn: item.image_alt_en ?? "",
          enStatus: item.en_status,
          attachments: Array.isArray(item.attachments) ? item.attachments : [],
          publicSlug: item.public_slug,
          status: item.status,
          reviewNote: item.review_note,
          editor: personProp(people.editor),
          reviewer: personProp(people.reviewer),
          publisher: personProp(people.publisher),
          reviewOwner: ownerMeta.reviewOwnerName
            ? {
                displayName: ownerMeta.reviewOwnerName,
                email: "",
                role: "review_owner",
              }
            : null,
          escalatedAt: ownerMeta.escalatedAt,
        }}
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
        reviewOwnerName={ownerMeta.reviewOwnerName}
        proposedOwnerName={ownerMeta.proposedOwnerName}
        proposedByName={ownerMeta.proposedByName}
      />

      {canReassign ? (
        <ReassignAuthor
          contentItemId={item.id}
          contentType="news"
          currentAuthorId={item.created_by}
        />
      ) : null}

      <CommentThread
        contentItemId={item.id}
        refreshToken={`${item.status}:${item.review_note ?? ""}:${item.updated_at.toISOString()}:${ownerMeta.escalatedAt ?? ""}`}
      />

      <RevisionHistory contentItemId={item.id} contentType="news" canRestore={canManage} />
    </main>
  );
}
