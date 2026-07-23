"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cmsToast } from "@/app/dashboard/cms-toast";
import type { ContentType, OrgUnit } from "@/lib/users";

const SPA_TYPES: ContentType[] = ["news", "event", "publication", "partner", "alert"];
const RESEARCH_TYPES: ContentType[] = ["research_group", "research_project"];

type Props = {
  initialOrgUnits: OrgUnit[];
};

export function OrgUnitsManager({ initialOrgUnits }: Props) {
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

  const catalogueSummary = useMemo(() => {
    const cw = orgUnits.find((o) => o.kind === "centre_wide");
    const depts = orgUnits.filter((o) => o.kind === "research_dept");
    return { cw, depts };
  }, [orgUnits]);

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
        const msg = data.error ?? "Create failed";
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      setMessage("Org unit created with the fixed type set for its kind.");
      cmsToast.success("Org unit created with the fixed type set for its kind.");
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
        const msg = data.error ?? "Update failed";
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      setMessage("Org unit updated.");
      cmsToast.success("Org unit updated.");
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
      const msg = impactData.error ?? "Could not check delete impact";
      setError(msg);
      cmsToast.error(msg);
      return;
    }
    const { contentCount, userScopeCount, reviewerClaim } = impactData.impact;
    if (contentCount > 0) {
      const msg = `Cannot delete "${o.id}": ${contentCount} content item(s) still use it. Move content first.`;
      setError(msg);
      cmsToast.error(msg);
      return;
    }
    const ok = window.confirm(
      `Delete org unit "${o.name_en}" (${o.id})?\n` +
        `This removes ${userScopeCount} user scope assignment(s)` +
        (reviewerClaim ? " and the Reviewer claim" : "") +
        ".",
    );
    if (!ok) return;

    setPending(true);
    try {
      const res = await fetch(`/api/org-units/${encodeURIComponent(o.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? "Delete failed";
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      const msg = `Deleted ${o.id}.`;
      setMessage(msg);
      cmsToast.success(msg);
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

      <section className="rounded-lg border border-crs-border bg-crs-bg px-4 py-3 text-sm text-crs-ink/90">
        <p className="font-medium text-crs-ink">Fixed content-type sets by org kind</p>
        <ul className="mt-2 list-disc ps-5 text-xs">
          <li>
            <span className="font-medium">Centre-wide:</span> {SPA_TYPES.join(", ")} (SPA
            sections — not shared with research depts)
          </li>
          <li>
            <span className="font-medium">Research department:</span>{" "}
            {RESEARCH_TYPES.join(", ")} — manage instances under Research groups / Projects
          </li>
        </ul>
        {catalogueSummary.cw ? (
          <p className="mt-2 text-xs">
            Current centre-wide catalog:{" "}
            {(catalogueSummary.cw.content_types ?? []).join(", ") || "—"}
          </p>
        ) : null}
      </section>

      <form
        onSubmit={createOrg}
        className="grid gap-3 cms-form rounded-2xl border border-crs-border bg-crs-surface p-6 shadow-sm"
      >
        <h2 className="text-lg font-medium text-crs-ink">Create org unit</h2>
        <p className="text-xs text-crs-muted">
          Type catalogs are fixed by kind. Create research groups and projects from the Research
          nav after assigning Editors to the dept.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Name (EN) *</span>
            <input
              required
              value={newNameEn}
              onChange={(e) => setNewNameEn(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Name (AR) *</span>
            <input
              required
              dir="rtl"
              value={newNameAr}
              onChange={(e) => setNewNameAr(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Kind *</span>
            <select
              value={newKind}
              onChange={(e) => setNewKind(e.target.value as "centre_wide" | "research_dept")}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
            >
              <option value="research_dept">Research department</option>
              <option value="centre_wide">Centre-wide</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Id (optional)</span>
            <input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink font-mono text-xs"
              placeholder="auto from EN name"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Sort order (optional)</span>
            <input
              type="number"
              value={newSort}
              onChange={(e) => setNewSort(e.target.value)}
              className="mt-1 w-full min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
              placeholder="auto"
            />
          </label>
        </div>
        <p className="text-xs text-crs-muted">
          Will assign:{" "}
          {(newKind === "centre_wide" ? SPA_TYPES : RESEARCH_TYPES).join(", ")}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="w-fit rounded-lg bg-crs-primary hover:bg-crs-secondary px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {pending ? "Saving…" : "Create"}
        </button>
      </form>

      <section className="overflow-x-auto rounded-2xl border border-crs-border bg-crs-surface shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b bg-crs-bg text-crs-muted">
            <tr>
              <th className="px-3 py-2">Id</th>
              <th className="px-3 py-2">Names</th>
              <th className="px-3 py-2">Kind / types</th>
              <th className="px-3 py-2">Sort</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orgUnits.map((o) => (
              <tr key={o.id} className="border-b last:border-0 align-top">
                <td className="px-3 py-3 font-mono text-xs">{o.id}</td>
                <td className="px-3 py-3">
                  {editId === o.id ? (
                    <div className="grid gap-2">
                      <input
                        value={editNameEn}
                        onChange={(e) => setEditNameEn(e.target.value)}
                        className="w-full rounded border px-2 py-1"
                        placeholder="EN"
                      />
                      <input
                        dir="rtl"
                        value={editNameAr}
                        onChange={(e) => setEditNameAr(e.target.value)}
                        className="w-full rounded border px-2 py-1"
                        placeholder="AR"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="font-medium">{o.name_en}</div>
                      <div dir="rtl" className="text-crs-muted">
                        {o.name_ar}
                      </div>
                    </>
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
                      <option value="research_dept">research_dept</option>
                      <option value="centre_wide">centre_wide</option>
                    </select>
                  ) : (
                    <>
                      <div>{o.kind}</div>
                      <div className="mt-1 text-xs text-crs-muted">
                        {(o.content_types ?? []).join(", ") || "—"}
                      </div>
                    </>
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
                        Save
                      </button>
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => setEditId(null)}
                      >
                        Cancel
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
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                        onClick={() => void removeOrg(o)}
                      >
                        Delete
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
