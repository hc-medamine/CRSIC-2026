"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  ContentType,
  EditorContentTypeClaim,
  ManagedUser,
  OrgUnit,
} from "@/lib/users";

const CONTENT_TYPES: ContentType[] = [
  "news",
  "event",
  "publication",
  "partner",
  "alert",
  "research_group",
  "research_project",
];

type Props = {
  initialEditors: ManagedUser[];
  initialOrgUnits: OrgUnit[];
  initialClaims: EditorContentTypeClaim[];
  actorRole: "reviewer" | "super_admin";
};

function catalogUnion(orgIds: string[], units: OrgUnit[]): Set<ContentType> {
  const set = new Set<ContentType>();
  for (const id of orgIds) {
    const o = units.find((u) => u.id === id);
    for (const t of o?.content_types ?? []) set.add(t);
  }
  return set;
}

export function EditorsScopeManager({
  initialEditors,
  initialOrgUnits,
  initialClaims,
  actorRole,
}: Props) {
  const router = useRouter();
  const [editors, setEditors] = useState(initialEditors);
  const [orgUnits, setOrgUnits] = useState(initialOrgUnits);
  const [claims, setClaims] = useState(initialClaims);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [draftTypes, setDraftTypes] = useState<Record<string, ContentType[]>>(() => {
    const map: Record<string, ContentType[]> = {};
    for (const e of initialEditors) map[e.id] = [...e.content_types];
    return map;
  });

  const orgName = useMemo(() => {
    const map = new Map(orgUnits.map((o) => [o.id, o.name_en]));
    return (id: string) => map.get(id) ?? id;
  }, [orgUnits]);

  const claimByType = useMemo(() => {
    const map = new Map<ContentType, EditorContentTypeClaim>();
    for (const c of claims) map.set(c.content_type, c);
    return map;
  }, [claims]);

  async function refresh() {
    const res = await fetch("/api/users/assigned-editors");
    const data = (await res.json()) as {
      ok: boolean;
      editors?: ManagedUser[];
      claims?: EditorContentTypeClaim[];
      orgUnits?: OrgUnit[];
    };
    if (data.ok && data.editors) {
      setEditors(data.editors);
      const map: Record<string, ContentType[]> = {};
      for (const e of data.editors) map[e.id] = [...e.content_types];
      setDraftTypes(map);
    }
    if (data.ok && data.claims) setClaims(data.claims);
    if (data.ok && data.orgUnits) setOrgUnits(data.orgUnits);
    router.refresh();
  }

  async function save(editorId: string) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/users/${editorId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_editor_content_types",
          contentTypes: draftTypes[editorId] ?? [],
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Save failed");
        return;
      }
      setMessage("Content types updated.");
      await refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-zinc-600">
        {actorRole === "reviewer"
          ? "Editors whose org scopes overlap yours. Content types are globally exclusive and must be in the org catalog."
          : "All Editors. Prefer the full Users page for org scopes and account actions."}
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      {editors.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-6 text-sm text-zinc-500">
          No assigned editors yet.
        </p>
      ) : (
        <ul className="grid gap-4">
          {editors.map((ed) => {
            const allowed = catalogUnion(ed.org_unit_ids, orgUnits);
            return (
              <li
                key={ed.id}
                className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium text-zinc-900">{ed.display_name}</p>
                  <p className="text-xs text-zinc-500">{ed.email}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Orgs:{" "}
                    {ed.org_unit_ids.map((id) => orgName(id)).join(", ") || "—"}
                  </p>
                </div>
                <fieldset className="text-sm">
                  <legend className="font-medium">Content types</legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {CONTENT_TYPES.map((t) => {
                      const checked = (draftTypes[ed.id] ?? []).includes(t);
                      const claim = claimByType.get(t);
                      const heldByOther = claim && claim.editor_id !== ed.id;
                      const inCatalog = allowed.has(t);
                      const blocked = Boolean(heldByOther) || !inCatalog;
                      return (
                        <label
                          key={t}
                          className={`flex items-center gap-1.5 ${blocked && !checked ? "text-zinc-400" : ""}`}
                          title={
                            !inCatalog
                              ? "Not in org catalog"
                              : heldByOther
                                ? `Held by ${claim.editor_email}`
                                : undefined
                          }
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={pending || (blocked && !checked)}
                            onChange={(e) => {
                              setDraftTypes((prev) => {
                                const cur = prev[ed.id] ?? [];
                                return {
                                  ...prev,
                                  [ed.id]: e.target.checked
                                    ? [...cur, t]
                                    : cur.filter((x) => x !== t),
                                };
                              });
                            }}
                          />
                          <span>{t}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void save(ed.id)}
                  className="w-fit rounded bg-zinc-900 px-3 py-1.5 text-sm text-white disabled:opacity-60"
                >
                  Save
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
