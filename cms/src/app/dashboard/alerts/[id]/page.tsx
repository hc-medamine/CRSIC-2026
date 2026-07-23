import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getAlertById } from "@/lib/content/alerts";
import { canAccessContentType, canReview } from "@/lib/content/permissions";
import { canViewContentItem, getContentMeta } from "@/lib/content/revisions";
import { listSelectableOrgUnits } from "@/lib/users";
import { getItemPeopleMeta } from "@/lib/content/people";
import { refreshUserFromDb } from "@/lib/content/ooo";
import { AlertEditorForm } from "../alert-form";
import { RevisionHistory } from "@/app/dashboard/revision-history";
import { ReassignAuthor } from "@/app/dashboard/reassign-author";
import { CommentThread } from "@/app/dashboard/comment-thread";

type Props = { params: Promise<{ id: string }> };

function personProp(p: { displayName: string; email: string; role: string } | null) {
  if (!p) return null;
  return { displayName: p.displayName, email: p.email, role: p.role };
}

export default async function AlertDetailPage({ params }: Props) {
  const sessionUser = await requireUser();
  const user = (await refreshUserFromDb(sessionUser.id)) ?? sessionUser;
  if (!(await canAccessContentType(user, "alert"))) redirect("/dashboard");
  const { id } = await params;
  const item = await getAlertById(id);
  if (!item) notFound();
  const meta = await getContentMeta(id);
  if (!meta || !(await canViewContentItem(user, meta))) redirect("/dashboard");
  const people = await getItemPeopleMeta(id);

  const orgs = await listSelectableOrgUnits(user, "alert", { keepOrgId: item.org_unit_id });
  const isAuthor = item.created_by === user.id || user.role === "super_admin";
  const reviewer = canReview(user) && item.created_by !== user.id;
  const canManage = user.role === "super_admin" || user.role === "reviewer";
  const canReassign = canManage && ["draft", "changes_requested", "submitted"].includes(item.status);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <header className="flex items-center justify-between border-b border-crs-border pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-crs-muted">Alerts</p>
          <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">Edit / review</h1>
        </div>
        <Link href="/dashboard/alerts" className="inline-flex min-h-11 items-center text-sm text-crs-primary hover:underline">
          Back
        </Link>
      </header>

      {!reviewer && canReview(user) && item.created_by === user.id ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Four-eyes: you authored this item, so you cannot approve or publish it. Use a different Reviewer account.
        </p>
      ) : null}

      {item.status === "approved" || item.status === "unpublished" ? (
        <p className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
          Publishing this alert will automatically unpublish any other currently-published alert — only one alert is
          shown on the public site at a time.
        </p>
      ) : null}

      <AlertEditorForm
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
          enStatus: item.en_status,
          alertLinkUrl: item.alert_link_url ?? "",
          alertLinkLabelAr: item.alert_link_label_ar ?? "",
          alertLinkLabelEn: item.alert_link_label_en ?? "",
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
          contentType="alert"
          currentAuthorId={item.created_by}
        />
      ) : null}

      <CommentThread
        contentItemId={item.id}
        refreshToken={`${item.status}:${item.review_note ?? ""}:${item.updated_at.toISOString()}`}
      />

      <RevisionHistory contentItemId={item.id} contentType="alert" canRestore={canManage} />
    </main>
  );
}
