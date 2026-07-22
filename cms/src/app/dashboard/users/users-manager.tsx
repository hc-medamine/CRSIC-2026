"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentType, ManagedUser, OrgUnit, UserRole } from "@/lib/users";

const CONTENT_TYPES: ContentType[] = [
  "news",
  "event",
  "publication",
  "partner",
  "alert",
  "research_group",
  "research_project",
];

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
    for (const t of o?.content_types ?? []) set.add(t);
  }
  return set;
}

export function UsersManager({ initialUsers, orgUnits: initialOrgUnits }: Props) {
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
        setError(data.error ?? "Create failed");
        return;
      }
      setMessage("User created.");
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
        setError(data.error ?? "Update failed");
        return false;
      }
      setMessage("Updated.");
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
        setError(data.error ?? "Could not load delete impact");
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
        setMessage("User deleted.");
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
    const map = new Map(orgUnits.map((o) => [o.id, o.name_en]));
    return (ids: string[]) => ids.map((id) => map.get(id) ?? id).join(", ") || "—";
  }, [orgUnits]);

  /** Global editor content-type claims derived from current users. */
  const claimByType = useMemo(() => {
    const map = new Map<ContentType, { id: string; email: string }>();
    for (const u of users) {
      if (u.role !== "editor") continue;
      for (const t of u.content_types) {
        map.set(t, { id: u.id, email: u.email });
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

      <p className="text-sm text-zinc-600">
        Manage organisation units on the{" "}
        <Link href="/dashboard/org-units" className="underline">
          Org scopes
        </Link>{" "}
        page.
      </p>

      <form onSubmit={createUser} className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-zinc-900">Create user</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Email (login)</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Temporary password</span>
            <input
              required
              type="text"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Display name</span>
            <input
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            >
              <option value="editor">Editor</option>
              <option value="reviewer">Reviewer</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Name (AR)</span>
            <input
              dir="rtl"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Name (EN)</span>
            <input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className="mt-1 w-full rounded border border-zinc-300 px-3 py-2"
            />
          </label>
        </div>

        {showOrgScopes ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="text-sm">
              <legend className="font-medium">
                {role === "reviewer" ? "Exclusive org scopes *" : "Org scopes *"}
              </legend>
              {role === "reviewer" ? (
                <p className="mt-1 text-xs text-zinc-500">
                  Two reviewers cannot share the same org unit.
                </p>
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
                    <span>
                      {o.name_en} <span className="text-zinc-500">({o.name_ar})</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            {showContentTypes ? (
              <fieldset className="text-sm">
                <legend className="font-medium">Content types * (globally exclusive)</legend>
                <p className="mt-1 text-xs text-zinc-500">
                  Only types allowed by selected org catalogs. Two editors cannot share a type.
                </p>
                <div className="mt-2 flex flex-col gap-1">
                  {CONTENT_TYPES.map((t) => {
                    const claim = claimByType.get(t);
                    const allowed = createAllowedTypes.has(t);
                    const blocked = Boolean(claim) || !allowed;
                    return (
                      <label
                        key={t}
                        className={`flex items-center gap-2 ${blocked && !contentTypes.includes(t) ? "text-zinc-400" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={contentTypes.includes(t)}
                          disabled={pending || (blocked && !contentTypes.includes(t))}
                          onChange={(e) => {
                            setContentTypes((prev) =>
                              e.target.checked ? [...prev, t] : prev.filter((x) => x !== t),
                            );
                          }}
                        />
                        <span>
                          {t}
                          {!allowed ? " (not in org catalog)" : null}
                          {claim ? ` (held by ${claim.email})` : null}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <p className="text-sm text-zinc-500">
                Reviewers review types from their org catalogs; orgs are exclusive.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Super Admins automatically receive all org units and content types.
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Create user"}
        </button>
      </form>

      <section className="overflow-x-auto rounded-lg border border-zinc-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Scopes</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b last:border-0">
                <td className="px-3 py-3 align-top">
                  <div className="font-medium text-zinc-900">{u.display_name}</div>
                  <div className="text-zinc-500">{u.email}</div>
                </td>
                <td className="px-3 py-3 align-top">{u.role}</td>
                <td className="px-3 py-3 align-top text-xs text-zinc-600">
                  {scopeEditId === u.id && (u.role === "editor" || u.role === "reviewer") ? (
                    <div className="grid max-w-xs gap-2">
                      <fieldset>
                        <legend className="font-medium">Orgs</legend>
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
                            {o.name_en}
                          </label>
                        ))}
                      </fieldset>
                      {u.role === "editor" ? (
                        <fieldset>
                          <legend className="font-medium">Types (exclusive)</legend>
                          {CONTENT_TYPES.map((t) => {
                            const claim = claimByType.get(t);
                            const heldByOther = claim && claim.id !== u.id;
                            const allowed = scopeAllowedTypes.has(t);
                            const blocked = Boolean(heldByOther) || !allowed;
                            return (
                              <label key={t} className="flex items-center gap-1">
                                <input
                                  type="checkbox"
                                  checked={scopeTypes.includes(t)}
                                  disabled={pending || (blocked && !scopeTypes.includes(t))}
                                  onChange={(e) =>
                                    setScopeTypes((prev) =>
                                      e.target.checked
                                        ? [...prev, t]
                                        : prev.filter((x) => x !== t),
                                    )
                                  }
                                />
                                {t}
                                {!allowed ? " (catalog)" : null}
                                {heldByOther ? ` (${claim.email})` : null}
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
                          Save scopes
                        </button>
                        <button
                          type="button"
                          className="text-xs underline"
                          onClick={() => setScopeEditId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>{orgLabel(u.org_unit_ids)}</div>
                      <div>{u.content_types.join(", ") || "—"}</div>
                    </>
                  )}
                </td>
                <td className="px-3 py-3 align-top">{u.is_active ? "Active" : "Inactive"}</td>
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
                      {u.is_active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => {
                        const next = window.prompt(`New password for ${u.email} (min 8 chars):`);
                        if (!next) return;
                        void patchUser(u.id, { action: "reset_password", password: next });
                      }}
                    >
                      Reset password
                    </button>
                    {(u.role === "editor" || u.role === "reviewer") && scopeEditId !== u.id ? (
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => startScopeEdit(u)}
                      >
                        Edit scopes
                      </button>
                    ) : null}
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                      onClick={() => void openDelete(u)}
                    >
                      Delete…
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
            <h3 className="text-lg font-semibold text-zinc-900">Delete {deleteImpact.user.email}?</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Hard delete is destructive. Drafts ({deleteImpact.draftCount}) will be removed.
              Non-draft items ({deleteImpact.nonDraftItems.length}) must be reassigned.
            </p>
            {deleteImpact.isLastSuperAdmin ? (
              <p className="mt-2 text-sm text-red-600">Cannot delete the last active Super Admin.</p>
            ) : null}
            {deleteImpact.nonDraftItems.length > 0 ? (
              <div className="mt-3">
                <p className="text-sm font-medium">Reassign these items to:</p>
                <ul className="mt-1 max-h-32 overflow-y-auto text-xs text-zinc-600">
                  {deleteImpact.nonDraftItems.map((i) => (
                    <li key={i.id}>
                      [{i.status}] {i.contentType}: {i.title}
                    </li>
                  ))}
                </ul>
                <select
                  className="mt-2 w-full rounded border px-3 py-2 text-sm"
                  value={reassignTo}
                  onChange={(e) => setReassignTo(e.target.value)}
                  required
                >
                  <option value="">Select user…</option>
                  {reassignCandidates.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name} ({c.email}) — {c.role}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <label className="mt-3 block text-sm">
              <span className="font-medium">Type email to confirm</span>
              <input
                value={confirmEmail}
                onChange={(e) => setConfirmEmail(e.target.value)}
                className="mt-1 w-full rounded border px-3 py-2 font-mono text-xs"
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
                {pending ? "Deleting…" : "Permanently delete"}
              </button>
              <button
                type="button"
                className="rounded border px-4 py-2 text-sm"
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteImpact(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
