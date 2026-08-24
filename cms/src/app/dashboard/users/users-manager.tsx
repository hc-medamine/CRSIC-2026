"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { SortableTh } from "@/app/dashboard/sortable-th";
import type { ContentType, ManagedUser, OrgUnit, UserRole } from "@/lib/users";
import { ALL_CONTENT_TYPES } from "@/lib/content-types";
import { sortRows, toggleHeaderSort, type HeaderSort } from "@/lib/content/headerSort";
import { ALL_CONTENT_TYPES } from "@/lib/content-types";
import {
  contentTypeLabel,
  localizedDisplayName,
  roleLabel,
  statusLabel,
  t,
  tf,
} from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

const CONTENT_TYPES: ContentType[] = ALL_CONTENT_TYPES;

type DeleteImpact = {
  user: { id: string; email: string; role: UserRole; displayName: string };
  draftCount: number;
  nonDraftItems: {
    id: string;
    contentType: string;
    title: string;
    status: string;
  }[];
  mediaCount: number;
  isLastSuperAdmin: boolean;
};

type Props = {
  initialUsers: ManagedUser[];
  orgUnits: OrgUnit[];
};

function catalogUnion(orgIds: string[], units: OrgUnit[]): Set<ContentType> {
  const set = new Set<ContentType>();
  for (const id of orgIds) {
    const o = units.find((u) => u.id === id);
    for (const ct of o?.content_types ?? []) set.add(ct);
  }
  return set;
}

function orgUnitName(o: OrgUnit, lang: "en" | "ar"): string {
  return lang === "ar" ? o.name_ar : o.name_en || o.name_ar;
}

export function UsersManager({ initialUsers, orgUnits: initialOrgUnits }: Props) {
  const lang = useCmsLang();
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const [orgUnits, setOrgUnits] = useState(initialOrgUnits);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [role, setRole] = useState<UserRole>("editor");
  const [orgUnitIds, setOrgUnitIds] = useState<string[]>([]);
  const [contentTypes, setContentTypes] = useState<ContentType[]>(["news"]);

  const [deleteTarget, setDeleteTarget] = useState<ManagedUser | null>(null);
  const [deleteImpact, setDeleteImpact] = useState<DeleteImpact | null>(null);
  const [reassignTo, setReassignTo] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");
  const [scopeEditId, setScopeEditId] = useState<string | null>(null);
  const [scopeOrgs, setScopeOrgs] = useState<string[]>([]);
  const [scopeTypes, setScopeTypes] = useState<ContentType[]>([]);
  const [sort, setSort] = useState<HeaderSort | null>(null);

  const showOrgScopes = role === "editor" || role === "reviewer";
  const showContentTypes = role === "editor";

  async function refresh() {
    const res = await fetch("/api/users");
    const data = (await res.json()) as { ok: boolean; users?: ManagedUser[] };
    if (data.ok && data.users) setUsers(data.users);
    const orgRes = await fetch("/api/org-units");
    const orgData = (await orgRes.json()) as { ok: boolean; orgUnits?: OrgUnit[] };
    if (orgData.ok && orgData.orgUnits) setOrgUnits(orgData.orgUnits);
    router.refresh();
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName,
          nameAr,
          nameEn,
          role,
          orgUnitIds: showOrgScopes ? orgUnitIds : undefined,
          contentTypes: showContentTypes ? contentTypes : undefined,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("usersCreateFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      setMessage(t("usersCreated", lang));
      cmsToast.success(t("usersCreated", lang));
      setEmail("");
      setPassword("");
      setDisplayName("");
      setNameAr("");
      setNameEn("");
      setOrgUnitIds([]);
      setContentTypes(["news"]);
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function patchUser(id: string, body: Record<string, unknown>) {
    setError(null);
    setMessage(null);
    setPending(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("usersUpdateFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return false;
      }
      if (body.action !== "delete") {
        setMessage(t("usersUpdated", lang));
        cmsToast.success(t("usersUpdated", lang));
      }
      await refresh();
      return true;
    } finally {
      setPending(false);
    }
  }

  async function openDelete(u: ManagedUser) {
    setError(null);
    setDeleteTarget(u);
    setConfirmEmail("");
    setReassignTo("");
    setDeleteImpact(null);
    setPending(true);
    try {
      const res = await fetch(`/api/users/${u.id}/delete-impact`);
      const data = (await res.json()) as { ok: boolean; impact?: DeleteImpact; error?: string };
      if (!res.ok || !data.ok || !data.impact) {
        const msg = data.error ?? t("usersDeleteImpactFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        setDeleteTarget(null);
        return;
      }
      setDeleteImpact(data.impact);
    } finally {
      setPending(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !deleteImpact) return;
    setPending(true);
    setError(null);
    try {
      const ok = await patchUser(deleteTarget.id, {
        action: "delete",
        confirmEmail,
        reassignToUserId: deleteImpact.nonDraftItems.length > 0 ? reassignTo || undefined : undefined,
      });
      if (ok) {
        setDeleteTarget(null);
        setDeleteImpact(null);
        setMessage(t("usersDeleted", lang));
        cmsToast.success(t("usersDeleted", lang));
      }
    } finally {
      setPending(false);
    }
  }

  function startScopeEdit(u: ManagedUser) {
    setScopeEditId(u.id);
    setScopeOrgs([...u.org_unit_ids]);
    setScopeTypes([...u.content_types]);
  }

  async function saveScopes(u: ManagedUser) {
    const ok = await patchUser(u.id, {
      action: "update_scopes",
      orgUnitIds: scopeOrgs,
      contentTypes: u.role === "editor" ? scopeTypes : CONTENT_TYPES,
    });
    if (ok) setScopeEditId(null);
  }

  const orgLabel = useMemo(() => {
    const map = new Map(
      orgUnits.map((o) => [o.id, orgUnitName(o, lang)]),
    );
    return (ids: string[]) => ids.map((id) => map.get(id) ?? id).join(", ") || "—";
  }, [orgUnits, lang]);

  const visibleUsers = useMemo(() => {
    return sortRows(
      users,
      sort,
      (u, key) => {
        if (key === "role") return roleLabel(u.role, lang);
        if (key === "access") {
          const types =
            u.content_types.length > 0
              ? u.content_types.map((ct) => contentTypeLabel(ct, lang)).join(", ")
              : "—";
          return `${orgLabel(u.org_unit_ids)} ${types}`;
        }
        if (key === "status") {
          return u.is_active ? t("usersStatusActive", lang) : t("usersStatusInactive", lang);
        }
        return localizedDisplayName(
          { displayName: u.display_name, nameAr: u.name_ar, nameEn: u.name_en },
          lang,
        );
      },
      () => "text",
      lang,
    );
  }, [users, sort, lang, orgLabel]);

  /** Global editor content-type claims derived from current users. */
  const claimByType = useMemo(() => {
    const map = new Map<ContentType, { id: string; email: string }>();
    for (const u of users) {
      if (u.role !== "editor") continue;
      for (const ct of u.content_types) {
        map.set(ct, { id: u.id, email: u.email });
      }
    }
    return map;
  }, [users]);

  const createAllowedTypes = useMemo(
    () => catalogUnion(orgUnitIds, orgUnits),
    [orgUnitIds, orgUnits],
  );

  const scopeAllowedTypes = useMemo(
    () => catalogUnion(scopeOrgs, orgUnits),
    [scopeOrgs, orgUnits],
  );

  const reassignCandidates = users.filter(
    (u) => u.is_active && (!deleteTarget || u.id !== deleteTarget.id),
  );

  return (
    <div className="flex flex-col gap-8">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      <p className="text-sm text-crs-muted">
        {t("usersOrgUnitsHint", lang)}{" "}
        <Link href="/dashboard/org-units" className="font-medium text-crs-primary hover:underline">
          {t("usersOrgUnitsLink", lang)}
        </Link>
        .
      </p>

      <form
        onSubmit={createUser}
        className="grid gap-3 cms-form rounded-2xl border border-crs-border bg-crs-surface p-6 shadow-[var(--crs-shadow-soft)]"
      >
        <h2 className="text-lg font-medium text-crs-ink">{t("usersCreateTitle", lang)}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">{t("usersEmail", lang)}</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-crs-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("usersTempPassword", lang)}</span>
            <input
              required
              type="text"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-crs-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("usersDisplayName", lang)}</span>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded border border-crs-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("usersRole", lang)}</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="mt-1 w-full rounded border border-crs-border px-3 py-2"
            >
              <option value="editor">{roleLabel("editor", lang)}</option>
              <option value="reviewer">{roleLabel("reviewer", lang)}</option>
              <option value="super_admin">{roleLabel("super_admin", lang)}</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("profileNameAr", lang)}</span>
            <input
              dir="rtl"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="mt-1 w-full rounded border border-crs-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("profileNameEn", lang)}</span>
            <input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="mt-1 w-full rounded border border-crs-border px-3 py-2"
            />
          </label>
        </div>

        {showOrgScopes ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="text-sm">
              <legend className="font-medium">
                {role === "reviewer" ? t("usersOrgsReviewer", lang) : t("usersOrgsEditor", lang)}
              </legend>
              {role === "reviewer" ? (
                <p className="mt-1 text-xs text-crs-muted">{t("usersOrgsReviewerHint", lang)}</p>
              ) : null}
              <div className="mt-2 flex flex-col gap-1">
                {orgUnits.map((o) => (
                  <label key={o.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={orgUnitIds.includes(o.id)}
                      onChange={(e) => {
                        setOrgUnitIds((prev) =>
                          e.target.checked ? [...prev, o.id] : prev.filter((id) => id !== o.id),
                        );
                      }}
                    />
                    <span>{orgUnitName(o, lang)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {showContentTypes ? (
              <fieldset className="text-sm">
                <legend className="font-medium">{t("usersContentTypes", lang)}</legend>
                <p className="mt-1 text-xs text-crs-muted">{t("usersContentTypesHint", lang)}</p>
                <div className="mt-2 flex flex-col gap-1">
                  {CONTENT_TYPES.map((ct) => {
                    const claim = claimByType.get(ct);
                    const allowed = createAllowedTypes.has(ct);
                    const blocked = Boolean(claim) || !allowed;
                    return (
                      <label
                        key={ct}
                        className={`flex items-center gap-2 ${blocked && !contentTypes.includes(ct) ? "text-crs-muted" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={contentTypes.includes(ct)}
                          disabled={pending || (blocked && !contentTypes.includes(ct))}
                          onChange={(e) => {
                            setContentTypes((prev) =>
                              e.target.checked ? [...prev, ct] : prev.filter((x) => x !== ct),
                            );
                          }}
                        />
                        <span>{contentTypeLabel(ct, lang)}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <p className="text-sm text-crs-muted">{t("usersReviewerNoTypes", lang)}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-crs-muted">{t("usersSaAutoAccess", lang)}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg bg-crs-primary hover:bg-crs-secondary px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? t("usersCreating", lang) : t("usersCreate", lang)}
        </button>
      </form>

      <section className="overflow-x-auto rounded-2xl border border-crs-border bg-crs-surface shadow-[var(--crs-shadow-soft)]">
        <table className="min-w-full text-start text-sm">
          <thead className="border-b bg-crs-bg text-crs-muted">
            <tr>
              <SortableTh
                label={t("usersColUser", lang)}
                sortKey="user"
                kind="text"
                sort={sort}
                lang={lang}
                className="px-3 py-2"
                onToggle={(key, kind) => setSort(toggleHeaderSort(sort, key, kind))}
              />
              <SortableTh
                label={t("usersColRole", lang)}
                sortKey="role"
                kind="text"
                sort={sort}
                lang={lang}
                className="px-3 py-2"
                onToggle={(key, kind) => setSort(toggleHeaderSort(sort, key, kind))}
              />
              <SortableTh
                label={t("usersColAccess", lang)}
                sortKey="access"
                kind="text"
                sort={sort}
                lang={lang}
                className="px-3 py-2"
                onToggle={(key, kind) => setSort(toggleHeaderSort(sort, key, kind))}
              />
              <SortableTh
                label={t("usersColStatus", lang)}
                sortKey="status"
                kind="text"
                sort={sort}
                lang={lang}
                className="px-3 py-2"
                onToggle={(key, kind) => setSort(toggleHeaderSort(sort, key, kind))}
              />
              <th className="px-3 py-2">{t("usersColActions", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-3 align-top">
                  <div className="font-medium text-crs-ink">
                    {localizedDisplayName(
                      {
                        displayName: u.display_name,
                        nameAr: u.name_ar,
                        nameEn: u.name_en,
                      },
                      lang,
                    )}
                  </div>
                  <div className="text-crs-muted">{u.email}</div>
                </td>
                <td className="px-3 py-3 align-top">{roleLabel(u.role, lang)}</td>
                <td className="px-3 py-3 align-top text-xs text-crs-muted">
                  {scopeEditId === u.id && (u.role === "editor" || u.role === "reviewer") ? (
                    <div className="grid max-w-xs gap-2">
                      <fieldset>
                        <legend className="font-medium">{t("usersOrgsShort", lang)}</legend>
                        {orgUnits.map((o) => (
                          <label key={o.id} className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={scopeOrgs.includes(o.id)}
                              onChange={(e) =>
                                setScopeOrgs((prev) =>
                                  e.target.checked
                                    ? [...prev, o.id]
                                    : prev.filter((id) => id !== o.id),
                                )
                              }
                            />
                            {orgUnitName(o, lang)}
                          </label>
                        ))}
                      </fieldset>
                      {u.role === "editor" ? (
                        <fieldset>
                          <legend className="font-medium">{t("usersTypesShort", lang)}</legend>
                          {CONTENT_TYPES.map((ct) => {
                            const claim = claimByType.get(ct);
                            const heldByOther = claim && claim.id !== u.id;
                            const allowed = scopeAllowedTypes.has(ct);
                            const blocked = Boolean(heldByOther) || !allowed;
                            return (
                              <label key={ct} className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={scopeTypes.includes(ct)}
                                  disabled={pending || (blocked && !scopeTypes.includes(ct))}
                                  onChange={(e) =>
                                    setScopeTypes((prev) =>
                                      e.target.checked
                                        ? [...prev, ct]
                                        : prev.filter((x) => x !== ct),
                                    )
                                  }
                                />
                                {contentTypeLabel(ct, lang)}
                              </label>
                            );
                          })}
                        </fieldset>
                      ) : null}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded border px-2 py-0.5 text-xs"
                          disabled={pending}
                          onClick={() => void saveScopes(u)}
                        >
                          {t("usersSaveAccess", lang)}
                        </button>
                        <button
                          type="button"
                          className="text-xs underline"
                          onClick={() => setScopeEditId(null)}
                        >
                          {t("usersCancel", lang)}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>{orgLabel(u.org_unit_ids)}</div>
                      <div>
                        {u.content_types.length > 0
                          ? u.content_types.map((ct) => contentTypeLabel(ct, lang)).join(", ")
                          : "—"}
                      </div>
                    </>
                  )}
                </td>
                <td className="px-3 py-3 align-top">
                  {u.is_active ? t("usersStatusActive", lang) : t("usersStatusInactive", lang)}
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() =>
                        void patchUser(u.id, {
                          action: u.is_active ? "deactivate" : "activate",
                        })
                      }
                    >
                      {u.is_active ? t("usersDeactivate", lang) : t("usersActivate", lang)}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => {
                        const next = window.prompt(
                          tf("usersResetPasswordPrompt", lang, { email: u.email }),
                        );
                        if (!next) return;
                        void patchUser(u.id, { action: "reset_password", password: next });
                      }}
                    >
                      {t("usersResetPassword", lang)}
                    </button>
                    {(u.role === "editor" || u.role === "reviewer") && scopeEditId !== u.id ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => startScopeEdit(u)}
                      >
                        {t("usersEditAccess", lang)}
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                      onClick={() => void openDelete(u)}
                    >
                      {t("usersDelete", lang)}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {deleteTarget && deleteImpact ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-crs-ink">
              {tf("usersDeleteTitle", lang, { email: deleteImpact.user.email })}
            </h3>
            <p className="mt-2 text-sm text-crs-muted">
              {tf("usersDeleteHint", lang, {
                drafts: deleteImpact.draftCount,
                items: deleteImpact.nonDraftItems.length,
              })}
            </p>
            {deleteImpact.isLastSuperAdmin ? (
              <p className="mt-2 text-sm text-red-600">{t("usersDeleteLastSa", lang)}</p>
            ) : null}
            {deleteImpact.nonDraftItems.length > 0 ? (
              <div className="mt-3">
                <p className="text-sm font-medium">{t("usersReassignTo", lang)}</p>
                <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-crs-muted">
                  {deleteImpact.nonDraftItems.map((i) => (
                    <li key={i.id}>
                      [{statusLabel(i.status, lang)}] {contentTypeLabel(i.contentType, lang)}:{" "}
                      {i.title}
                    </li>
                  ))}
                </ul>
                <select
                  className="mt-2 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  required
                >
                  <option value="">{t("usersSelectUser", lang)}</option>
                  {reassignCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {localizedDisplayName(
                        {
                          displayName: c.display_name,
                          nameAr: c.name_ar,
                          nameEn: c.name_en,
                        },
                        lang,
                      )}{" "}
                      ({c.email}) — {roleLabel(c.role, lang)}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <label className="mt-3 block text-sm">
              <span className="font-medium">{t("usersConfirmEmail", lang)}</span>
              <input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink font-mono text-xs"
                placeholder={deleteImpact.user.email}
              />
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={
                  pending ||
                  deleteImpact.isLastSuperAdmin ||
                  confirmEmail.trim().toLowerCase() !== deleteImpact.user.email ||
                  (deleteImpact.nonDraftItems.length > 0 && !reassignTo)
                }
                className="rounded bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={() => void confirmDelete()}
              >
                {pending ? t("usersDeleting", lang) : t("usersDeleteConfirm", lang)}
              </button>
              <button
                type="button"
                className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteImpact(null);
                }}
              >
                {t("usersCancel", lang)}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
