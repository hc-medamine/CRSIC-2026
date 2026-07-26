"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cmsToast } from "@/app/dashboard/cms-toast";
import type {
  ContentType,
  EditorContentTypeClaim,
  ManagedUser,
  OrgUnit,
} from "@/lib/users";
import {
  contentTypeLabel,
  localizedDisplayName,
  t,
  tf,
} from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

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
    for (const ct of o?.content_types ?? []) set.add(ct);
  }
  return set;
}

function orgUnitName(o: OrgUnit, lang: "en" | "ar"): string {
  return lang === "ar" ? o.name_ar : o.name_en || o.name_ar;
}

export function EditorsScopeManager({
  initialEditors,
  initialOrgUnits,
  initialClaims,
  actorRole,
}: Props) {
  const lang = useCmsLang();
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
    const map = new Map(orgUnits.map((o) => [o.id, orgUnitName(o, lang)]));
    return (id: string) => map.get(id) ?? id;
  }, [orgUnits, lang]);

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
        const msg = data.error ?? t("editorsSaveFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      setMessage(t("editorsSaved", lang));
      cmsToast.success(t("editorsSaved", lang));
      await refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-crs-muted">
        {actorRole === "reviewer" ? t("editorsHintReviewer", lang) : t("editorsHintSa", lang)}
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      {editors.length === 0 ? (
        <p className="rounded-lg border border-dashed border-crs-border p-6 text-sm text-crs-muted">
          {t("editorsEmpty", lang)}
        </p>
      ) : (
        <ul className="grid gap-4">
          {editors.map((ed) => {
            const allowed = catalogUnion(ed.org_unit_ids, orgUnits);
            return (
              <li
                key={ed.id}
                className="grid gap-3 rounded-2xl border border-crs-border bg-crs-surface p-4 shadow-sm"
              >
                <div>
                  <p className="font-medium text-crs-ink">
                    {localizedDisplayName(
                      {
                        displayName: ed.display_name,
                        nameAr: ed.name_ar,
                        nameEn: ed.name_en,
                      },
                      lang,
                    )}
                  </p>
                  <p className="text-xs text-crs-muted">{ed.email}</p>
                  <p className="mt-1 text-xs text-crs-muted">
                    {t("editorsOrgs", lang)}:{" "}
                    {ed.org_unit_ids.map((id) => orgName(id)).join(", ") || "—"}
                  </p>
                </div>
                <fieldset className="text-sm">
                  <legend className="font-medium">{t("editorsContentTypes", lang)}</legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {CONTENT_TYPES.map((ct) => {
                      const checked = (draftTypes[ed.id] ?? []).includes(ct);
                      const claim = claimByType.get(ct);
                      const heldByOther = claim && claim.editor_id !== ed.id;
                      const inCatalog = allowed.has(ct);
                      const blocked = Boolean(heldByOther) || !inCatalog;
                      return (
                        <label
                          key={ct}
                          className={`flex items-center gap-1.5 ${blocked && !checked ? "text-crs-muted" : ""}`}
                          title={
                            !inCatalog
                              ? t("editorsTypeNotAvailable", lang)
                              : heldByOther
                                ? tf("editorsTypeHeldBy", lang, {
                                    email: claim.editor_email,
                                  })
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
                                    ? [...cur, ct]
                                    : cur.filter((x) => x !== ct),
                                };
                              });
                            }}
                          />
                          <span>{contentTypeLabel(ct, lang)}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void save(ed.id)}
                  className="w-fit rounded-lg bg-crs-primary hover:bg-crs-secondary px-3 py-1.5 text-sm text-white disabled:opacity-60"
                >
                  {t("editorsSave", lang)}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
