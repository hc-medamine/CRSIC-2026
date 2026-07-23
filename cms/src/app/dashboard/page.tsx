import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { getQueues, type QueueItem } from "@/lib/content/queues";
import { listPendingReviewOwnerProposals } from "@/lib/content/delegation";
import { listNeedsPostReview } from "@/lib/content/emergency";
import { canAccessContentType } from "@/lib/content/permissions";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { HomeTipBanner } from "./home-tip-banner";

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
  emptyCta,
  showAuthor,
  showNote,
  maxVisible,
  hideWhenEmpty,
  quiet,
  moreLabel,
}: {
  title: string;
  items: QueueItem[];
  emptyLabel: string;
  emptyCta?: { href: string; label: string };
  showAuthor?: boolean;
  showNote?: boolean;
  /** Cap list length for dense queues (e.g. EN pending). */
  maxVisible?: number;
  /** Skip the card entirely when there is nothing to show. */
  hideWhenEmpty?: boolean;
  /** Secondary/overview styling — less visual weight. */
  quiet?: boolean;
  moreLabel: string;
}) {
  if (hideWhenEmpty && items.length === 0) return null;

  const visible =
    typeof maxVisible === "number" && maxVisible > 0 ? items.slice(0, maxVisible) : items;
  const hiddenCount = items.length - visible.length;
  const shell = quiet
    ? "rounded-lg border border-zinc-100 bg-zinc-50/60"
    : "rounded-lg border border-zinc-200 bg-white shadow-sm";

  return (
    <section className={shell}>
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
        <h2 className={`text-sm font-semibold ${quiet ? "text-zinc-700" : "text-zinc-900"}`}>
          {title}
        </h2>
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            quiet ? "bg-zinc-200/80 text-zinc-600" : "bg-zinc-100 text-zinc-600"
          }`}
        >
          {items.length}
        </span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-4 text-sm text-zinc-500">
          <p>{emptyLabel}</p>
          {emptyCta ? (
            <Link href={emptyCta.href} className="mt-2 inline-block text-zinc-800 underline">
              {emptyCta.label}
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="divide-y divide-zinc-100">
          {visible.map((item) => (
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
      {hiddenCount > 0 ? (
        <p className="border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500">
          +{hiddenCount} {moreLabel}
        </p>
      ) : null}
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
  const canNews = await canAccessContentType(user, "news");

  const subtitle =
    user.role === "editor"
      ? t("homeSubtitleEditor", lang)
      : user.role === "reviewer"
        ? t("homeSubtitleReviewer", lang)
        : t("homeSubtitleSa", lang);

  const primaryReview = queues.awaitingReview[0];
  const primaryDraft = queues.myDrafts[0];
  const primaryRevision = queues.needsRevision[0];
  const primaryEn = queues.englishPending[0];
  const moreLabel = t("moreInQueue", lang);

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-6 py-8 font-sans">
      <header className="border-b border-zinc-200 pb-4">
        <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS</p>
        <h1 className="text-2xl font-semibold text-zinc-900">{t("homeTitle", lang)}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          {subtitle} · {user.displayName} · {user.role}
        </p>
      </header>

      <HomeTipBanner lang={lang} />

      <div className="flex flex-wrap gap-2">
        {canReview && primaryReview ? (
          <Link
            href={primaryReview.href}
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {t("ctaReviewNext", lang)}
          </Link>
        ) : null}
        {!canReview && primaryRevision ? (
          <Link
            href={primaryRevision.href}
            className="rounded bg-amber-700 px-3 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            {t("ctaFixRevision", lang)}
          </Link>
        ) : null}
        {!canReview && primaryDraft ? (
          <Link
            href={primaryDraft.href}
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            {t("ctaContinueDraft", lang)}
          </Link>
        ) : null}
        {canNews ? (
          <Link
            href="/dashboard/news/new"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
          >
            {t("ctaCreateNews", lang)}
          </Link>
        ) : (
          <Link
            href="/dashboard/news"
            className="rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-50"
          >
            {t("ctaBrowseContent", lang)}
          </Link>
        )}
        {queues.englishPending.length > 0 && primaryEn ? (
          <Link
            href={primaryEn.href}
            className="rounded border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            {t("ctaEnglishNext", lang)} ({queues.englishPending.length})
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Primary work — always visible */}
        {canReview && needsPostReview.length > 0 ? (
          <section className="rounded-lg border border-red-200 bg-white shadow-sm md:col-span-2">
            <div className="flex items-center justify-between border-b border-red-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-red-950">
                Needs post-publication review
              </h2>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-800">
                {needsPostReview.length}
              </span>
            </div>
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
          </section>
        ) : null}

        {user.role === "super_admin" && pendingOwners.length > 0 ? (
          <section className="rounded-lg border border-zinc-200 bg-white shadow-sm md:col-span-2">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-zinc-900">
                Pending review-owner proposals
              </h2>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                {pendingOwners.length}
              </span>
            </div>
            <ul className="divide-y divide-zinc-100">
              {pendingOwners.map((p) => (
                <li key={p.id} className="px-4 py-3">
                  <Link href={p.href} className="font-medium underline" dir="auto">
                    {p.title}
                  </Link>
                  <p className="mt-1 text-xs text-zinc-500">
                    Propose {p.proposedOwnerName ?? "—"}
                    {p.proposedByName ? ` · by ${p.proposedByName}` : ""}
                    {p.proposedAt ? ` · ${p.proposedAt.slice(0, 16).replace("T", " ")}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {canReview ? (
          <QueueList
            title={t("awaitingReview", lang)}
            items={queues.awaitingReview}
            emptyLabel={t("emptyAwaitingReview", lang)}
            showAuthor
            moreLabel={moreLabel}
          />
        ) : null}

        <QueueList
          title={t("needsRevision", lang)}
          items={queues.needsRevision}
          emptyLabel={t("emptyNeedsRevision", lang)}
          showAuthor={canReview}
          showNote
          moreLabel={moreLabel}
        />
        <QueueList
          title={t("myDrafts", lang)}
          items={queues.myDrafts}
          emptyLabel={t("emptyMyDrafts", lang)}
          moreLabel={moreLabel}
        />

        {/* Secondary / overview — quieter, hide when empty */}
        <QueueList
          title={t("englishPending", lang)}
          items={queues.englishPending}
          emptyLabel={t("englishPendingEmpty", lang)}
          showAuthor={canReview}
          maxVisible={3}
          hideWhenEmpty
          quiet
          moreLabel={moreLabel}
        />
        <QueueList
          title={t("rejected", lang)}
          items={queues.rejected}
          emptyLabel={t("noItems", lang)}
          showAuthor={canReview}
          showNote
          hideWhenEmpty
          quiet
          moreLabel={moreLabel}
        />
        <QueueList
          title={t("unpublished", lang)}
          items={queues.unpublished}
          emptyLabel={t("noItems", lang)}
          showAuthor={canReview}
          hideWhenEmpty
          quiet
          moreLabel={moreLabel}
        />
        <QueueList
          title={t("recentlyPublished", lang)}
          items={queues.recentlyPublished}
          emptyLabel={t("noItems", lang)}
          showAuthor={canReview}
          maxVisible={5}
          hideWhenEmpty
          quiet
          moreLabel={moreLabel}
        />
        {canReview ? null : (
          <QueueList
            title={t("awaitingReview", lang)}
            items={queues.awaitingReview}
            emptyLabel={t("emptyAwaitingReview", lang)}
            hideWhenEmpty
            quiet
            moreLabel={moreLabel}
          />
        )}
      </div>
    </main>
  );
}
