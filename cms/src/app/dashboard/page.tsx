import Link from "next/link";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/session";
import { getQueues, STATUS_ORDER_COLUMNS } from "@/lib/content/queues";
import { listPendingReviewOwnerProposals } from "@/lib/content/delegation";
import { listNeedsPostReview } from "@/lib/content/emergency";
import { canEditAsAuthor, getNavContentTypes } from "@/lib/content/permissions";
import { contentPathSegment } from "@/lib/content/lifecycle";
import { refreshUserFromDb } from "@/lib/content/ooo";
import {
  CMS_LANG_COOKIE,
  normalizeLang,
  t,
  localizedDisplayName,
} from "@/lib/i18n/labels";
import type { ContentType } from "@/lib/users";
import { HomeOnboarding } from "./home-onboarding";
import { CreateContentMenu } from "./create-content-menu";
import { EditorStatsTable } from "./editor-stats-table";
import { IconArrow, IconDoc, IconGlobe, IconInbox } from "./cms-icons";
import { QueueCard, StatCard } from "./ui-bits";

const CREATE_LABEL_KEY: Record<ContentType, string> = {
  news: "news",
  event: "events",
  publication: "publications",
  partner: "partners",
  alert: "alerts",
  research_group: "researchGroups",
  research_project: "researchProjects",
  law: "laws",
  platform: "platforms",
};

export default async function DashboardPage() {
  const sessionUser = await requireUser();
  const user = (await refreshUserFromDb(sessionUser.id)) ?? sessionUser;
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

  const fullName = localizedDisplayName(
    {
      displayName: user.displayName,
      nameAr: user.nameAr,
      nameEn: user.nameEn,
    },
    lang,
  );
  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
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

  const roleSubtitle =
    user.role === "reviewer"
      ? t("homeSubtitleReviewer", lang)
      : user.role === "super_admin"
        ? t("homeSubtitleSa", lang)
        : t("homeSubtitleEditor", lang);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-crs-border bg-gradient-to-br from-crs-surface via-crs-surface to-crs-accent/10 p-5 shadow-[var(--crs-shadow-soft)] lg:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-crs-ink lg:text-3xl">
            {t("welcomeBack", lang)}, {firstName}.
          </h1>
          <p className="mt-2 text-sm text-crs-muted">{roleSubtitle}</p>
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

      <HomeOnboarding lang={lang} />

      {canReview && needsPostReview.length > 0 ? (
        <section className="rounded-2xl border border-red-200 bg-crs-surface p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-red-950">{t("needsPostPublicationReview", lang)}</h2>
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
          <h2 className="text-sm font-semibold text-crs-ink">{t("pendingReviewOwnerProposals", lang)}</h2>
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

      <section aria-label={t("statsOverview", lang)}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={t("statsDrafts", lang)}
            value={draftsQueue.length}
            icon={<IconDoc />}
            href={hasNews ? "/dashboard/news" : undefined}
          />
          <StatCard
            label={t("statsReview", lang)}
            value={queues.awaitingReview.length}
            icon={<IconInbox />}
            href={hasNews ? "/dashboard/news" : undefined}
          />
          <StatCard
            label={t("statsPublished", lang)}
            value={queues.recentlyPublished.length}
            icon={<IconGlobe />}
            href={hasNews ? "/dashboard/news" : undefined}
          />
          <StatCard
            label={t("statsEnglish", lang)}
            value={queues.englishPending.length}
            icon={<IconGlobe />}
            href={hasNews ? "/dashboard/news" : undefined}
          />
        </div>
      </section>

      {queues.editorStats.length > 0 ? (
        <section aria-label={t("statsSubmittedTitle", lang)}>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-6 rounded-full bg-crs-accent" aria-hidden />
            <h2 className="text-sm font-semibold text-crs-ink">{t("statsSubmittedTitle", lang)}</h2>
          </div>
          {queues.editorStats.length > 0 ? (
            <EditorStatsTable editors={queues.editorStats} columns={STATUS_ORDER_COLUMNS} lang={lang} />
          ) : (
            <p className="mt-3 text-sm text-crs-muted">{t("statsSubmittedEmpty", lang)}</p>
          )}
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {canReview ? (
          <QueueCard
            title={t("reviewInbox", lang)}
            hint={t("reviewInboxHint", lang)}
            icon={<IconInbox />}
            items={queues.awaitingReview}
            emptyLabel={t("emptyAwaitingReview", lang)}
            emptyHint={t("emptyReviewHint", lang)}
            showAuthor={canReview}
            authorPrefix={t("submittedBy", lang)}
            footerHref={hasNews ? "/dashboard/news" : undefined}
            footerLabel={t("viewFullInbox", lang)}
          />
        ) : null}
        <QueueCard
          title={t("draftsNeedingWork", lang)}
          hint={t("draftsNeedingWorkHint", lang)}
          icon={<IconDoc />}
          items={draftsQueue}
          emptyLabel={t("emptyMyDrafts", lang)}
          emptyHint={t("emptyDraftsHint", lang)}
          emptyCta={
            createOptions.length > 0
              ? { href: createOptions[0]!.href, label: t("emptyCtaCreate", lang) }
              : undefined
          }
          footerHref={hasNews ? "/dashboard/news" : undefined}
          footerLabel={t("viewAllDrafts", lang)}
        />
        {!canReview ? (
          <QueueCard
            title={t("awaitingReview", lang)}
            hint={t("reviewInboxHint", lang)}
            icon={<IconInbox />}
            items={queues.awaitingReview}
            emptyLabel={t("emptyAwaitingReview", lang)}
            emptyHint={t("emptyReviewHint", lang)}
            footerHref={hasNews ? "/dashboard/news" : undefined}
            footerLabel={t("viewFullInbox", lang)}
          />
        ) : null}
        <QueueCard
          title={t("recentlyPublished", lang)}
          hint={t("recentlyPublishedHint", lang)}
          icon={<IconGlobe />}
          items={queues.recentlyPublished}
          emptyLabel={t("noItems", lang)}
          emptyHint={t("emptyPublishedHint", lang)}
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
