import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { getQueues, type QueueItem } from "@/lib/content/queues";
import { listPendingReviewOwnerProposals } from "@/lib/content/delegation";
import { listNeedsPostReview } from "@/lib/content/emergency";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";

const TYPE_BADGE: Record<QueueItem["contentType"], string> = {
  news: "News",
  event: "Event",
  publication: "Publication",
  partner: "Partner",
  alert: "Alert",
  research_group: "Research group",
  research_project: "Research project",
};

function QueueList({
  title,
  items,
  emptyLabel,
  showAuthor,
  showNote,
}: {
  title: string;
  items: QueueItem[];
  emptyLabel: string;
  showAuthor?: boolean;
  showNote?: boolean;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-sm text-zinc-500">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {items.map((item) => (
            <li key={item.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link href={item.href} className="font-medium text-zinc-900 underline" dir="auto">
                  {item.title}
                </Link>
                <span className="rounded bg-zinc-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-zinc-500">
                  {TYPE_BADGE[item.contentType]}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                {item.status}
                {showAuthor && item.authorName ? ` · ${item.authorName}` : ""}
                {` · ${item.updatedAt.slice(0, 16).replace("T", " ")}`}
              </p>
              {showNote && item.reviewNote ? (
                <p className="mt-1 text-xs text-amber-700" dir="auto">
                  {item.reviewNote}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const queues = await getQueues(user);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const canReview = user.role === "reviewer" || user.role === "super_admin";
  const pendingOwners =
    user.role === "super_admin" ? await listPendingReviewOwnerProposals() : [];
  const needsPostReview = canReview ? await listNeedsPostReview() : [];

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-8 font-sans">
      <header className="border-b border-zinc-200 pb-4">
        <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS</p>
        <h1 className="text-2xl font-semibold text-zinc-900">{t("dashboard", lang)}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {user.displayName} · {user.role} · session idle timeout 30 minutes.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {canReview ? (
          <section className="rounded-lg border border-red-200 bg-white shadow-sm md:col-span-2">
            <div className="flex items-center justify-between border-b border-red-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-red-950">
                Needs post-publication review
              </h2>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                {needsPostReview.length}
              </span>
            </div>
            {needsPostReview.length === 0 ? (
              <p className="px-4 py-4 text-sm text-zinc-500">No emergency items awaiting review.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {needsPostReview.map((p) => (
                  <li key={p.id} className="px-4 py-3">
                    <Link href={p.href} className="font-medium underline" dir="auto">
                      {p.title}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">
                      {p.publishedByName ? `by ${p.publishedByName}` : "Emergency"}
                      {p.publishedAt ? ` · ${p.publishedAt.slice(0, 16).replace("T", " ")}` : ""}
                    </p>
                    {p.reason ? (
                      <p className="mt-1 text-xs text-red-800" dir="auto">
                        {p.reason}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
        {user.role === "super_admin" ? (
          <section className="rounded-lg border border-zinc-200 bg-white shadow-sm md:col-span-2">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">
                Pending review-owner proposals
              </h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                {pendingOwners.length}
              </span>
            </div>
            {pendingOwners.length === 0 ? (
              <p className="px-4 py-4 text-sm text-zinc-500">No pending proposals.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {pendingOwners.map((p) => (
                  <li key={p.id} className="px-4 py-3">
                    <Link href={p.href} className="font-medium underline" dir="auto">
                      {p.title}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">
                      Propose {p.proposedOwnerName ?? "—"}
                      {p.proposedByName ? ` · by ${p.proposedByName}` : ""}
                      {p.proposedAt
                        ? ` · ${p.proposedAt.slice(0, 16).replace("T", " ")}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
        <QueueList
          title={t("awaitingReview", lang)}
          items={queues.awaitingReview}
          emptyLabel={t("noItems", lang)}
          showAuthor={canReview}
        />
        <QueueList
          title={t("englishPending", lang)}
          items={queues.englishPending}
          emptyLabel={t("englishPendingEmpty", lang)}
          showAuthor={canReview}
        />
        <QueueList
          title={t("needsRevision", lang)}
          items={queues.needsRevision}
          emptyLabel={t("noItems", lang)}
          showAuthor={canReview}
          showNote
        />
        <QueueList
          title={t("myDrafts", lang)}
          items={queues.myDrafts}
          emptyLabel={t("noItems", lang)}
        />
        <QueueList
          title={t("rejected", lang)}
          items={queues.rejected}
          emptyLabel={t("noItems", lang)}
          showAuthor={canReview}
          showNote
        />
        <QueueList
          title={t("unpublished", lang)}
          items={queues.unpublished}
          emptyLabel={t("noItems", lang)}
          showAuthor={canReview}
        />
        <QueueList
          title={t("recentlyPublished", lang)}
          items={queues.recentlyPublished}
          emptyLabel={t("noItems", lang)}
          showAuthor={canReview}
        />
      </div>
    </main>
  );
}
