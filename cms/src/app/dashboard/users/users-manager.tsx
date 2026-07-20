"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentType, ManagedUser, OrgUnit, UserRole } from "@/lib/users";

const CONTENT_TYPES: ContentType[] = ["news", "event", "publication"];

type Props = {
  initialUsers: ManagedUser[];
  orgUnits: OrgUnit[];
};

export function UsersManager({ initialUsers, orgUnits }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
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

  const showEditorScopes = role === "editor";

  async function refresh() {
    const res = await fetch("/api/users");
    const data = (await res.json()) as { ok: boolean; users?: ManagedUser[] };
    if (data.ok && data.users) setUsers(data.users);
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
          orgUnitIds: showEditorScopes ? orgUnitIds : undefined,
          contentTypes: showEditorScopes ? contentTypes : undefined,
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
        return;
      }
      setMessage("Updated.");
      await refresh();
    } finally {
      setPending(false);
    }
  }

  const orgLabel = useMemo(() => {
    const map = new Map(orgUnits.map((o) => [o.id, o.name_en]));
    return (ids: string[]) => ids.map((id) => map.get(id) ?? id).join(", ") || "—";
  }, [orgUnits]);

  return (
    <div className="flex flex-col gap-8">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

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

        {showEditorScopes ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <fieldset className="text-sm">
              <legend className="font-medium">Org scopes</legend>
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
            <fieldset className="text-sm">
              <legend className="font-medium">Content types</legend>
              <div className="mt-2 flex flex-col gap-1">
                {CONTENT_TYPES.map((t) => (
                  <label key={t} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={contentTypes.includes(t)}
                      onChange={(e) => {
                        setContentTypes((prev) =>
                          e.target.checked ? [...prev, t] : prev.filter((x) => x !== t),
                        );
                      }}
                    />
                    <span>{t}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Reviewers and Super Admins automatically receive centre-wide + all research departments
            and all content types (PRD).
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
                  <div>{orgLabel(u.org_unit_ids)}</div>
                  <div>{u.content_types.join(", ") || "—"}</div>
                </td>
                <td className="px-3 py-3 align-top">{u.is_active ? "Active" : "Inactive"}</td>
                <td className="px-3 py-3 align-top">
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() =>
                        patchUser(u.id, {
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
