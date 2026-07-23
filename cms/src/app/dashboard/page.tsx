import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { getQueues } from "@/lib/content/queues";
import { listPendingReviewOwnerProposals } from "@/lib/content/delegation";
import { listNeedsPostReview } from "@/lib/content/emergency";
import { canEditAsAuthor, getNavContentTypes } from "@/lib/content/permissions";
import { contentPathSegment } from "@/lib/content/lifecycle";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import type { ContentType } from "@/lib/users";
import { HomeTipBanner } from "./home-tip-banner";
import { CreateContentMenu } from "./create-content-menu";
import { IconArrow, IconDoc, IconGlobe, IconInbox } from "./cms-icons";
import { QueueCard } from "./ui-bits";

const CREATE_LABEL_KEY: Record<ContentType, string> = {
  news: "news",
  event: "events",
  publication: "publications",
  partner: "partners",
  alert: "alerts",
  research_group: "researchGroups",
  research_project: "researchProjects",
};

export default async function DashboardPage() {
  const user = await requireUser();
  const queues = await getQueues(user);
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const canReview = user.role === "reviewer" || user.role === "super_admin";
  const pendingOwners =
    user.role === "super_admin" ? await listPendingReviewOwnerProposals() : [];
  const needsPostReview = canReview ? await listNeedsPostReview() : [];
  const navTypes = canEditAsAuthor(user) ? await getNavContentTypes(user) : [];
  const createOptions = navTypes.map((type) => ({
    href: `/dashboard/${contentPathSegment(type)}/new`,
    label: t(CREATE_LABEL_KEY[type], lang),
  }));

  const firstName = user.displayName.trim().split(/\s+/)[0] || user.displayName;
  const primaryReview = queues.awaitingReview[0];
  const primaryDraft = queues.myDrafts[0];
  const primaryRevision = queues.needsRevision[0];

  const primaryCta = canReview
    ? primaryReview
      ? { href: primaryReview.href, label: t("openNextReview", lang) }
      : null
    : primaryRevision
      ? { href: primaryRevision.href, label: t("ctaFixRevision", lang) }
      : primaryDraft
        ? { href: primaryDraft.href, label: t("ctaContinueDraft", lang) }
        : null;

  const draftsQueue =
    queues.needsRevision.length > 0
      ? [...queues.needsRevision, ...queues.myDrafts]
      : queues.myDrafts;

  const hasNews = navTypes.includes("news");

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 font-sans lg:px-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">
            {t("welcomeBack", lang)}, {firstName}.
          </h1>
          <p className="mt-3 text-lg font-medium text-crs-ink">{t("yourQueues", lang)}</p>
          <p className="mt-1 text-sm text-crs-muted">{t("queuesSubtitle", lang)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {primaryCta ? (
            <Link
              href={primaryCta.href}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-crs-primary px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-crs-secondary"
            >
              {primaryCta.label}
              <IconArrow className="h-4 w-4" />
            </Link>
          ) : null}
          <CreateContentMenu options={createOptions} menuLabel={t("ctaCreate", lang)} />
        </div>
      </header>

      <HomeTipBanner lang={lang} />

      {canReview && needsPostReview.length > 0 ? (
        <section className="rounded-2xl border border-red-200 bg-crs-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-red-950">Needs post-publication review</h2>
          <ul className="mt-3 divide-y divide-crs-border/70">
            {needsPostReview.map((p) => (
              <li key={p.id} className="py-3">
                <Link href={p.href} className="font-medium text-crs-ink underline" dir="auto">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {user.role === "super_admin" && pendingOwners.length > 0 ? (
        <section className="rounded-2xl border border-crs-border bg-crs-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-crs-ink">Pending review-owner proposals</h2>
          <ul className="mt-3 divide-y divide-crs-border/70">
            {pendingOwners.map((p) => (
              <li key={p.id} className="py-3">
                <Link href={p.href} className="font-medium text-crs-ink underline" dir="auto">
                  {p.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <QueueCard
          title={t("draftsNeedingWork", lang)}
          hint={t("draftsNeedingWorkHint", lang)}
          icon={<IconDoc />}
          items={draftsQueue}
          emptyLabel={t("emptyMyDrafts", lang)}
          footerHref={hasNews ? "/dashboard/news" : undefined}
          footerLabel={t("viewAllDrafts", lang)}
        />
        <QueueCard
          title={canReview ? t("reviewInbox", lang) : t("awaitingReview", lang)}
          hint={t("reviewInboxHint", lang)}
          icon={<IconInbox />}
          items={queues.awaitingReview}
          emptyLabel={t("emptyAwaitingReview", lang)}
          showAuthor={canReview}
          authorPrefix={t("submittedBy", lang)}
          footerHref={canReview ? "/dashboard/news" : undefined}
          footerLabel={t("viewFullInbox", lang)}
        />
        <QueueCard
          title={t("recentlyPublished", lang)}
          hint={t("recentlyPublishedHint", lang)}
          icon={<IconGlobe />}
          items={queues.recentlyPublished}
          emptyLabel={t("noItems", lang)}
          footerHref={hasNews ? "/dashboard/news" : undefined}
          footerLabel={t("viewAllPublished", lang)}
        />
        {queues.englishPending.length > 0 ? (
          <QueueCard
            title={t("englishPending", lang)}
            hint={t("englishPendingEmpty", lang)}
            icon={<IconDoc />}
            items={queues.englishPending}
            emptyLabel={t("englishPendingEmpty", lang)}
            showAuthor={canReview}
          />
        ) : null}
        {queues.rejected.length > 0 ? (
          <QueueCard
            title={t("rejected", lang)}
            hint={t("noItems", lang)}
            icon={<IconDoc />}
            items={queues.rejected}
            emptyLabel={t("noItems", lang)}
            showAuthor={canReview}
          />
        ) : null}
        {queues.unpublished.length > 0 ? (
          <QueueCard
            title={t("unpublished", lang)}
            hint={t("noItems", lang)}
            icon={<IconDoc />}
            items={queues.unpublished}
            emptyLabel={t("noItems", lang)}
            showAuthor={canReview}
          />
        ) : null}
      </div>
    </main>
  );
}
