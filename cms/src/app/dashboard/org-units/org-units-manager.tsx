"use client";

import { FormEvent, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { cmsToast } from "@/app/dashboard/cms-toast";
import type { ContentType, OrgUnit } from "@/lib/users";
import { RESEARCH_CONTENT_TYPES, SPA_CONTENT_TYPES } from "@/lib/content-types";
import { t, tf } from "@/lib/i18n/labels";
import { useCmsLang } from "@/lib/i18n/cms-lang";

const SPA_TYPES: ContentType[] = SPA_CONTENT_TYPES;
const RESEARCH_TYPES: ContentType[] = RESEARCH_CONTENT_TYPES;

type Props = {
  initialOrgUnits: OrgUnit[];
};

function kindLabel(kind: OrgUnit["kind"], lang: "en" | "ar"): string {
  return kind === "centre_wide" ? t("orgKindCentreWide", lang) : t("orgKindResearchDept", lang);
}

function displayName(o: OrgUnit, lang: "en" | "ar"): string {
  return lang === "ar" ? o.name_ar : o.name_en || o.name_ar;
}

export function OrgUnitsManager({ initialOrgUnits }: Props) {
  const lang = useCmsLang();
  const router = useRouter();
  const [orgUnits, setOrgUnits] = useState(initialOrgUnits);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const [newId, setNewId] = useState("");
  const [newNameAr, setNewNameAr] = useState("");
  const [newNameEn, setNewNameEn] = useState("");
  const [newKind, setNewKind] = useState<"centre_wide" | "research_dept">("research_dept");
  const [newSort, setNewSort] = useState("");

  const [editId, setEditId] = useState<string | null>(null);
  const [editNameAr, setEditNameAr] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editKind, setEditKind] = useState<"centre_wide" | "research_dept">("research_dept");
  const [editSort, setEditSort] = useState(0);

  async function refresh() {
    const res = await fetch("/api/org-units");
    const data = (await res.json()) as { ok: boolean; orgUnits?: OrgUnit[] };
    if (data.ok && data.orgUnits) setOrgUnits(data.orgUnits);
    router.refresh();
  }

  async function createOrg(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/org-units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newId.trim() || undefined,
          nameAr: newNameAr,
          nameEn: newNameEn,
          kind: newKind,
          sortOrder: newSort.trim() ? Number(newSort) : undefined,
          contentTypes: newKind === "centre_wide" ? SPA_TYPES : RESEARCH_TYPES,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("orgCreateFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      setMessage(t("orgCreated", lang));
      cmsToast.success(t("orgCreated", lang));
      setNewId("");
      setNewNameAr("");
      setNewNameEn("");
      setNewKind("research_dept");
      setNewSort("");
      await refresh();
    } finally {
      setPending(false);
    }
  }

  function startEdit(o: OrgUnit) {
    setEditId(o.id);
    setEditNameAr(o.name_ar);
    setEditNameEn(o.name_en);
    setEditKind(o.kind);
    setEditSort(o.sort_order);
    setError(null);
    setMessage(null);
  }

  async function saveEdit() {
    if (!editId) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/org-units/${encodeURIComponent(editId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameAr: editNameAr,
          nameEn: editNameEn,
          kind: editKind,
          sortOrder: editSort,
          contentTypes: editKind === "centre_wide" ? SPA_TYPES : RESEARCH_TYPES,
        }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("orgUpdateFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      setMessage(t("orgUpdated", lang));
      cmsToast.success(t("orgUpdated", lang));
      setEditId(null);
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function removeOrg(o: OrgUnit) {
    setError(null);
    setMessage(null);
    const impactRes = await fetch(`/api/org-units/${encodeURIComponent(o.id)}`);
    const impactData = (await impactRes.json()) as {
      ok: boolean;
      impact?: { contentCount: number; userScopeCount: number; reviewerClaim: boolean };
      error?: string;
    };
    if (!impactRes.ok || !impactData.ok || !impactData.impact) {
      const msg = impactData.error ?? t("orgDeleteImpactFailed", lang);
      setError(msg);
      cmsToast.error(msg);
      return;
    }
    const { contentCount, userScopeCount, reviewerClaim } = impactData.impact;
    const name = displayName(o, lang);
    if (contentCount > 0) {
      const msg = tf("orgDeleteBlockedContent", lang, { name, count: contentCount });
      setError(msg);
      cmsToast.error(msg);
      return;
    }
    const ok = window.confirm(
      tf("orgDeleteConfirm", lang, {
        name,
        users: userScopeCount,
        reviewer: reviewerClaim ? t("orgDeleteConfirmReviewer", lang) : "",
      }),
    );
    if (!ok) return;

    setPending(true);
    try {
      const res = await fetch(`/api/org-units/${encodeURIComponent(o.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? t("orgDeleteFailed", lang);
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      setMessage(t("orgDeleted", lang));
      cmsToast.success(t("orgDeleted", lang));
      if (editId === o.id) setEditId(null);
      await refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}

      <form
        onSubmit={createOrg}
        className="grid gap-3 cms-form rounded-2xl border border-crs-border bg-crs-surface p-6 shadow-sm"
      >
        <h2 className="text-lg font-medium text-crs-ink">{t("orgCreateTitle", lang)}</h2>
        <p className="text-xs text-crs-muted">{t("orgCreateHint", lang)}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">{t("orgNameEn", lang)}</span>
            <input
              required
              value={newNameEn}
              onChange={(e) => setNewNameEn(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("orgNameAr", lang)}</span>
            <input
              required
              dir="rtl"
              value={newNameAr}
              onChange={(e) => setNewNameAr(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("orgKind", lang)}</span>
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as "centre_wide" | "research_dept")}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            >
              <option value="research_dept">{t("orgKindResearchDept", lang)}</option>
              <option value="centre_wide">{t("orgKindCentreWide", lang)}</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("orgIdOptional", lang)}</span>
            <input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
              placeholder={t("orgIdPlaceholder", lang)}
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">{t("orgSortOptional", lang)}</span>
            <input
              type="number"
              value={newSort}
              onChange={(e) => setNewSort(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
              placeholder={t("orgSortPlaceholder", lang)}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg bg-crs-primary hover:bg-crs-secondary px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {pending ? t("orgCreating", lang) : t("orgCreate", lang)}
        </button>
      </form>

      <section className="overflow-x-auto rounded-2xl border border-crs-border bg-crs-surface shadow-sm">
        <table className="min-w-full text-start text-sm">
          <thead className="border-b bg-crs-bg text-crs-muted">
            <tr>
              <th className="px-3 py-2">{t("orgColName", lang)}</th>
              <th className="px-3 py-2">{t("orgColKind", lang)}</th>
              <th className="px-3 py-2">{t("orgColSort", lang)}</th>
              <th className="px-3 py-2">{t("orgColActions", lang)}</th>
            </tr>
          </thead>
          <tbody>
            {orgUnits.map((o, i) => (
              <tr
                key={o.id}
                className="cms-row-enter border-b last:border-0 align-top"
                style={{ "--row-delay": `${Math.min(i, 11) * 45}ms` } as CSSProperties}
              >
                <td className="px-3 py-3">
                  {editId === o.id ? (
                    <div className="grid gap-2">
                      <input
                        value={editNameEn}
                        onChange={(e) => setEditNameEn(e.target.value)}
                        className="w-full rounded border px-2 py-1"
                        placeholder={t("orgNameEn", lang)}
                      />
                      <input
                        dir="rtl"
                        value={editNameAr}
                        onChange={(e) => setEditNameAr(e.target.value)}
                        className="w-full rounded border px-2 py-1"
                        placeholder={t("orgNameAr", lang)}
                      />
                    </div>
                  ) : (
                    <div className="font-medium text-crs-ink">{displayName(o, lang)}</div>
                  )}
                </td>
                <td className="px-3 py-3">
                  {editId === o.id ? (
                    <select
                      value={editKind}
                      onChange={(e) =>
                        setEditKind(e.target.value as "centre_wide" | "research_dept")
                      }
                      className="rounded border px-2 py-1"
                    >
                      <option value="research_dept">{t("orgKindResearchDept", lang)}</option>
                      <option value="centre_wide">{t("orgKindCentreWide", lang)}</option>
                    </select>
                  ) : (
                    kindLabel(o.kind, lang)
                  )}
                </td>
                <td className="px-3 py-3">
                  {editId === o.id ? (
                    <input
                      type="number"
                      value={editSort}
                      onChange={(e) => setEditSort(Number(e.target.value))}
                      className="w-20 rounded border px-2 py-1"
                    />
                  ) : (
                    o.sort_order
                  )}
                </td>
                <td className="px-3 py-3">
                  {editId === o.id ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => void saveEdit()}
                      >
                        {t("orgSave", lang)}
                      </button>
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => setEditId(null)}
                      >
                        {t("orgCancel", lang)}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded border px-2 py-1 text-xs"
                        onClick={() => startEdit(o)}
                      >
                        {t("orgEdit", lang)}
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                        onClick={() => void removeOrg(o)}
                      >
                        {t("orgDelete", lang)}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
