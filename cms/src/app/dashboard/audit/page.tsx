import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/users";
import { listAuditLog } from "@/lib/audit";
import { formatDateTime } from "@/lib/format-datetime";
import {
  CMS_LANG_COOKIE,
  normalizeLang,
  t,
  auditActionLabel,
  auditEntityLabel,
  contentTypeLabel,
} from "@/lib/i18n/labels";
import { PageBreadcrumb } from "@/app/dashboard/ui-bits";

type Props = {
  searchParams: Promise<{
    action?: string;
    actor?: string;
    entityType?: string;
    from?: string;
    to?: string;
  }>;
};

const ACTION_FILTERS = [
  "auth.login.success",
  "auth.login.fail",
  "auth.logout",
  "user.create",
  "user.activate",
  "user.deactivate",
  "user.reset_password",
  "user.update_scopes",
  "user.update_profile",
  "user.delete",
  "user.away_set",
  "user.away_cleared",
  "org.create",
  "org.update",
  "org.delete",
  "media.upload",
  "media.replace",
  "media.delete",
  "content.reassign",
  "content.review_owner_proposed",
  "content.review_owner_set",
  "content.review_owner_rejected",
  "content.escalated",
  "news.publish",
  "news.unpublish",
  "news.submit",
  "news.approve",
  "news.reject",
  "news.changes_requested",
  "event.publish",
  "publication.publish",
  "partner.publish",
  "alert.publish",
  "research_group.publish",
  "research_project.publish",
] as const;

const ENTITY_FILTERS = [
  "news",
  "event",
  "publication",
  "partner",
  "alert",
  "research_group",
  "research_project",
  "user",
  "media",
  "org_unit",
] as const;

function hasFilters(p: {
  action?: string;
  actor?: string;
  entityType?: string;
  from?: string;
  to?: string;
}): boolean {
  return Boolean(
    p.action?.trim() ||
      p.actor?.trim() ||
      p.entityType?.trim() ||
      p.from?.trim() ||
      p.to?.trim(),
  );
}

export default async function AuditLogPage({ searchParams }: Props) {
  await requireSuperAdmin();
  const params = await searchParams;
  const action = params.action?.trim() || undefined;
  const actor = params.actor?.trim() || undefined;
  const entityType = params.entityType?.trim() || undefined;
  const from = params.from?.trim() || undefined;
  const to = params.to?.trim() || undefined;
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  const rows = await listAuditLog({
    action,
    actorEmail: actor,
    entityType,
    from,
    to,
    limit: 150,
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <PageBreadcrumb
        items={[
          { href: "/dashboard", label: t("home", lang) },
          { label: t("audit", lang) },
        ]}
      />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">{t("audit", lang)}</h1>
        <p className="mt-1 text-sm text-crs-muted">{t("pageDescAudit", lang)}</p>
      </header>

      <form
        method="get"
        className="grid gap-3 rounded-2xl border border-crs-border bg-crs-surface p-4 text-sm sm:grid-cols-2 lg:grid-cols-3"
      >
        <label>
          <span className="font-medium">{t("auditFilterAction", lang)}</span>
          <select
            name="action"
            defaultValue={action ?? ""}
            className="mt-1 block w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
          >
            <option value="">{t("auditFilterActionAll", lang)}</option>
            {ACTION_FILTERS.map((a) => (
              <option key={a} value={a}>
                {auditActionLabel(a, lang)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="font-medium">{t("auditFilterActor", lang)}</span>
          <input
            name="actor"
            defaultValue={actor ?? ""}
            placeholder={t("auditFilterActorPh", lang)}
            className="mt-1 block w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
          />
        </label>
        <label>
          <span className="font-medium">{t("auditFilterEntity", lang)}</span>
          <select
            name="entityType"
            defaultValue={entityType ?? ""}
            className="mt-1 block w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
          >
            <option value="">{t("auditFilterEntityAll", lang)}</option>
            {ENTITY_FILTERS.map((e) => (
              <option key={e} value={e}>
                {e === "user" || e === "media" || e === "org_unit"
                  ? auditEntityLabel(e, lang)
                  : contentTypeLabel(e, lang)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-2">
          <label>
            <span className="font-medium">{t("auditFilterFrom", lang)}</span>
            <input
              name="from"
              type="date"
              defaultValue={from ?? ""}
              className="mt-1 block w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label>
            <span className="font-medium">{t("auditFilterTo", lang)}</span>
            <input
              name="to"
              type="date"
              defaultValue={to ?? ""}
              className="mt-1 block w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
          <button
            type="submit"
            className="rounded-lg bg-crs-primary hover:bg-crs-secondary px-3 py-2 text-white"
          >
            {t("auditApply", lang)}
          </button>
          {hasFilters(params) ? (
            <Link
              href="/dashboard/audit"
              className="inline-flex min-h-11 items-center text-sm text-crs-primary hover:underline"
            >
              {t("auditClear", lang)}
            </Link>
          ) : null}
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="cms-empty-state rounded-lg border border-dashed border-crs-border p-6 text-sm text-crs-muted">
          {t("auditEmpty", lang)}
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border border-crs-border bg-crs-surface shadow-sm">
          {rows.map((row, i) => (
            <li
              key={row.id}
              className="cms-row-enter px-4 py-3 text-sm"
              style={{ "--row-delay": `${Math.min(i, 11) * 45}ms` } as CSSProperties}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold text-crs-ink">
                  {auditActionLabel(row.action, lang)}
                </p>
                <time className="text-xs text-crs-muted">
                  {formatDateTime(row.created_at)}
                </time>
              </div>
              {row.summary ? <p className="mt-1 text-crs-ink/90">{row.summary}</p> : null}
              <p className="mt-1 text-xs text-crs-muted">
                {row.actor_email ?? t("auditNoActor", lang)}
                {row.entity_type ? ` · ${auditEntityLabel(row.entity_type, lang)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
