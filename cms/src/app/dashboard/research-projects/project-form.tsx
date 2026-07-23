"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemWorkflowMeta, type PersonDisplay } from "@/app/dashboard/item-workflow-meta";
import { RichBodyEditor } from "@/app/dashboard/rich-body-editor";
import {
  SeoFieldsSection,
  copyMetaTitleFrom,
  emptySeoFormState,
  type SeoFormState,
} from "@/app/dashboard/seo-fields";

type OrgUnit = { id: string; name_ar: string; name_en: string };

type BilingualRow = { ar: string; en: string };

type ResearchGroupOption = { id: string; title_ar: string; title_en: string | null };

type Initial = {
  id?: string;
  orgUnitId: string;
  researchGroupId: string;
  titleAr: string;
  titleEn: string;
  leadAr: string;
  leadEn: string;
  bodyAr: string;
  bodyEn: string;
  questionsAr: string;
  questionsEn: string;
  axes: BilingualRow[];
  durationAr: string;
  durationEn: string;
  impacts: BilingualRow[];
  enStatus: "pending" | "ready";
  status?: string;
  reviewNote?: string | null;
  editor?: PersonDisplay;
  reviewer?: PersonDisplay;
  publisher?: PersonDisplay;
  metaTitleAr?: string;
  metaTitleEn?: string;
  metaDescriptionAr?: string;
  metaDescriptionEn?: string;
  ogImage?: string;
};

type Props = {
  mode: "create" | "edit";
  orgUnits: OrgUnit[];
  initial?: Initial;
  /** Current research group, kept in the picker even if not in the fetched (published-only) list. */
  initialGroupOption?: ResearchGroupOption | null;
  canSubmit?: boolean;
  canReview?: boolean;
  isAuthor?: boolean;
  canDelete?: boolean;
};

function emptyRow(): BilingualRow {
  return { ar: "", en: "" };
}

export function ResearchProjectForm({
  mode,
  orgUnits,
  initial,
  initialGroupOption,
  canSubmit,
  canReview,
  isAuthor,
  canDelete,
}: Props) {
  const router = useRouter();
  const [orgUnitId, setOrgUnitId] = useState(initial?.orgUnitId ?? orgUnits[0]?.id ?? "");
  const [researchGroupId, setResearchGroupId] = useState(initial?.researchGroupId ?? "");
  const [groups, setGroups] = useState<ResearchGroupOption[]>(
    initialGroupOption ? [initialGroupOption] : [],
  );
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [titleAr, setTitleAr] = useState(initial?.titleAr ?? "");
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? "");
  const [leadAr, setLeadAr] = useState(initial?.leadAr ?? "");
  const [leadEn, setLeadEn] = useState(initial?.leadEn ?? "");
  const [bodyAr, setBodyAr] = useState(initial?.bodyAr ?? "");
  const [bodyEn, setBodyEn] = useState(initial?.bodyEn ?? "");
  const [questionsAr, setQuestionsAr] = useState(initial?.questionsAr ?? "");
  const [questionsEn, setQuestionsEn] = useState(initial?.questionsEn ?? "");
  const [axes, setAxes] = useState<BilingualRow[]>(
    initial?.axes && initial.axes.length > 0 ? initial.axes : [emptyRow()],
  );
  const [durationAr, setDurationAr] = useState(initial?.durationAr ?? "");
  const [durationEn, setDurationEn] = useState(initial?.durationEn ?? "");
  const [impacts, setImpacts] = useState<BilingualRow[]>(
    initial?.impacts && initial.impacts.length > 0 ? initial.impacts : [emptyRow()],
  );
  const [enStatus, setEnStatus] = useState<"pending" | "ready">(initial?.enStatus ?? "pending");
  const [seo, setSeo] = useState<SeoFormState>(() => ({
    ...emptySeoFormState(),
    metaTitleAr: initial?.metaTitleAr ?? "",
    metaTitleEn: initial?.metaTitleEn ?? "",
    metaDescriptionAr: initial?.metaDescriptionAr ?? "",
    metaDescriptionEn: initial?.metaDescriptionEn ?? "",
    ogImage: initial?.ogImage ?? "",
  }));
  const [checklist, setChecklist] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const editable = mode === "create" || initial?.status === "draft" || initial?.status === "changes_requested";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!orgUnitId) {
        setGroups([]);
        return;
      }
      setGroupsLoading(true);
      try {
        const res = await fetch(`/api/research-groups?orgUnitId=${encodeURIComponent(orgUnitId)}`);
        const data = (await res.json()) as { ok: boolean; items?: ResearchGroupOption[] };
        if (cancelled || !data.ok || !data.items) return;
        const fetched = data.items;
        const keep =
          initialGroupOption && orgUnitId === initial?.orgUnitId && !fetched.some((g) => g.id === initialGroupOption.id)
            ? [initialGroupOption]
            : [];
        setGroups([...keep, ...fetched]);
      } finally {
        if (!cancelled) setGroupsLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgUnitId, initial?.orgUnitId, initialGroupOption]);

  function updateRow(list: BilingualRow[], set: (r: BilingualRow[]) => void, index: number, patch: Partial<BilingualRow>) {
    set(list.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function fields() {
    return {
      orgUnitId,
      researchGroupId,
      titleAr,
      titleEn,
      leadAr,
      leadEn,
      bodyAr,
      bodyEn,
      questionsAr,
      questionsEn,
      axes: axes.filter((a) => a.ar.trim()).map((a) => ({ ar: a.ar, en: a.en })),
      durationAr,
      durationEn,
      impacts: impacts.filter((i) => i.ar.trim()).map((i) => ({ ar: i.ar, en: i.en })),
      enStatus,
      metaTitleAr: seo.metaTitleAr,
      metaTitleEn: seo.metaTitleEn,
      metaDescriptionAr: seo.metaDescriptionAr,
      metaDescriptionEn: seo.metaDescriptionEn,
      ogImage: seo.ogImage.trim() || null,
    };
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/research-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields()),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; item?: { id: string } };
      if (!res.ok || !data.ok || !data.item) {
        setError(data.error ?? "Create failed");
        return;
      }
      router.push(`/dashboard/research-projects/${data.item.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function run(action: string, extra?: Record<string, unknown>) {
    if (!initial?.id) return;
    if (action === "delete") {
      const ok = window.confirm("Permanently delete this item? This cannot be undone.");
      if (!ok) return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/research-projects/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; deleted?: boolean };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Action failed");
        return;
      }
      if (data.deleted) {
        router.push("/dashboard/research-projects");
        router.refresh();
        return;
      }
      setMessage("Saved.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {initial?.status ? (
        <ItemWorkflowMeta
          status={initial.status}
          enStatus={initial.enStatus}
          reviewNote={initial.reviewNote}
          editor={initial.editor}
          reviewer={initial.reviewer}
          publisher={initial.publisher}
        />
      ) : null}

      <form
        onSubmit={mode === "create" ? create : (e) => e.preventDefault()}
        className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <label className="text-sm">
          <span className="font-medium">Organisation unit</span>
          <select
            disabled={!editable}
            value={orgUnitId}
            onChange={(e) => {
              setOrgUnitId(e.target.value);
              setResearchGroupId("");
            }}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            {orgUnits.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name_en} ({o.name_ar})
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="font-medium">Research group *</span>
          <select
            disabled={!editable || groupsLoading}
            value={researchGroupId}
            onChange={(e) => setResearchGroupId(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="">— select a group —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title_ar} {g.title_en ? `(${g.title_en})` : ""}
              </option>
            ))}
          </select>
          {groupsLoading ? <p className="mt-1 text-xs text-zinc-500">Loading groups…</p> : null}
          {!groupsLoading && groups.length === 0 ? (
            <p className="mt-1 text-xs text-amber-700">
              No published research groups for this org yet. Publish one first.
            </p>
          ) : null}
        </label>

        <label className="text-sm">
          <span className="font-medium">Project title (AR) *</span>
          <input dir="rtl" required disabled={!editable} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="font-medium">Project title (EN)</span>
          <input disabled={!editable} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Lead (AR) *</span>
            <input dir="rtl" disabled={!editable} value={leadAr} onChange={(e) => setLeadAr(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="font-medium">Lead (EN)</span>
            <input disabled={!editable} value={leadEn} onChange={(e) => setLeadEn(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
        </div>

        <RichBodyEditor label="Dibaja / body (AR)" value={bodyAr} onChange={setBodyAr} disabled={!editable} dir="rtl" />
        <RichBodyEditor label="Dibaja / body (EN)" value={bodyEn} onChange={setBodyEn} disabled={!editable} dir="ltr" />

        <label className="text-sm">
          <span className="font-medium">Research questions (AR)</span>
          <textarea dir="rtl" disabled={!editable} value={questionsAr} onChange={(e) => setQuestionsAr(e.target.value)} rows={3} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="font-medium">Research questions (EN)</span>
          <textarea disabled={!editable} value={questionsEn} onChange={(e) => setQuestionsEn(e.target.value)} rows={3} className="mt-1 w-full rounded border px-3 py-2" />
        </label>

        <fieldset className="grid gap-2 rounded border border-zinc-200 bg-zinc-50/80 p-3">
          <legend className="px-1 text-sm font-semibold text-zinc-900">Research axes</legend>
          {axes.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input dir="rtl" disabled={!editable} placeholder="Axis (AR)" value={row.ar} onChange={(e) => updateRow(axes, setAxes, i, { ar: e.target.value })} className="rounded border px-3 py-2 text-sm" />
              <input disabled={!editable} placeholder="Axis (EN)" value={row.en} onChange={(e) => updateRow(axes, setAxes, i, { en: e.target.value })} className="rounded border px-3 py-2 text-sm" />
              {editable ? (
                <button type="button" onClick={() => setAxes((prev) => prev.filter((_, j) => j !== i))} className="rounded border border-red-300 px-3 py-2 text-xs text-red-700">
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {editable ? (
            <button type="button" onClick={() => setAxes((prev) => [...prev, emptyRow()])} className="w-fit text-xs underline">
              + Add axis
            </button>
          ) : null}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Duration (AR)</span>
            <input dir="rtl" disabled={!editable} value={durationAr} onChange={(e) => setDurationAr(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="font-medium">Duration (EN)</span>
            <input disabled={!editable} value={durationEn} onChange={(e) => setDurationEn(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
          </label>
        </div>

        <fieldset className="grid gap-2 rounded border border-zinc-200 bg-zinc-50/80 p-3">
          <legend className="px-1 text-sm font-semibold text-zinc-900">Impacts</legend>
          {impacts.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input dir="rtl" disabled={!editable} placeholder="Impact (AR)" value={row.ar} onChange={(e) => updateRow(impacts, setImpacts, i, { ar: e.target.value })} className="rounded border px-3 py-2 text-sm" />
              <input disabled={!editable} placeholder="Impact (EN)" value={row.en} onChange={(e) => updateRow(impacts, setImpacts, i, { en: e.target.value })} className="rounded border px-3 py-2 text-sm" />
              {editable ? (
                <button type="button" onClick={() => setImpacts((prev) => prev.filter((_, j) => j !== i))} className="rounded border border-red-300 px-3 py-2 text-xs text-red-700">
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {editable ? (
            <button type="button" onClick={() => setImpacts((prev) => [...prev, emptyRow()])} className="w-fit text-xs underline">
              + Add impact
            </button>
          ) : null}
        </fieldset>

        <label className="text-sm">
          <span className="font-medium">EN status</span>
          <select disabled={!editable} value={enStatus} onChange={(e) => setEnStatus(e.target.value as "pending" | "ready")} className="mt-1 w-full rounded border px-3 py-2">
            <option value="pending">pending</option>
            <option value="ready">ready</option>
          </select>
        </label>

        <SeoFieldsSection
          value={seo}
          onChange={setSeo}
          disabled={!editable}
          onCopyTitleAr={() => setSeo((s) => copyMetaTitleFrom(titleAr, s))}
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}

        <div className="flex flex-wrap gap-2">
          {mode === "create" ? (
            <button type="submit" disabled={pending || !researchGroupId} className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60">
              {pending ? "Saving…" : "Create draft"}
            </button>
          ) : null}
          {mode === "edit" && editable && isAuthor ? (
            <>
              <button type="button" disabled={pending} className="rounded bg-zinc-900 px-4 py-2 text-sm text-white" onClick={() => void run("save", { fields: fields() })}>
                Save draft
              </button>
              {canSubmit ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={checklist} onChange={(e) => setChecklist(e.target.checked)} />
                  Checklist OK
                </label>
              ) : null}
              {canSubmit ? (
                <button type="button" disabled={pending || !checklist} className="rounded border px-4 py-2 text-sm disabled:opacity-60" onClick={() => void run("submit", { checklistConfirmed: checklist })}>
                  Submit for review
                </button>
              ) : null}
            </>
          ) : null}
          {mode === "edit" && initial?.status === "submitted" && isAuthor ? (
            <button type="button" disabled={pending} className="rounded border px-4 py-2 text-sm" onClick={() => void run("withdraw")}>
              Withdraw
            </button>
          ) : null}
        </div>
      </form>

      {mode === "edit" && canReview && initial?.status === "submitted" ? (
        <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium">Reviewer actions</p>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for changes / rejection" className="w-full rounded border px-3 py-2 text-sm" rows={2} />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pending} className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white" onClick={() => void run("approve")}>Approve</button>
            <button type="button" disabled={pending} className="rounded border px-3 py-1.5 text-sm" onClick={() => void run("request_changes", { note })}>Request changes</button>
            <button type="button" disabled={pending} className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700" onClick={() => void run("reject", { note })}>Reject</button>
          </div>
        </div>
      ) : null}

      {mode === "edit" && canReview && (initial?.status === "approved" || initial?.status === "unpublished") ? (
        <button type="button" disabled={pending} className="w-fit rounded bg-emerald-700 px-4 py-2 text-sm text-white" onClick={() => void run("publish")}>
          Publish to public research-projects.json
        </button>
      ) : null}

      {mode === "edit" && (isAuthor || canReview) && initial?.status === "published" ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={pending} className="w-fit rounded border border-emerald-300 px-4 py-2 text-sm text-emerald-800" onClick={() => void run("start_revision")}>
            Create revision (public stays live)
          </button>
          {canReview ? (
            <button type="button" disabled={pending} className="w-fit rounded border px-4 py-2 text-sm" onClick={() => void run("unpublish")}>
              Unpublish
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === "edit" && isAuthor && initial?.status === "rejected" ? (
        <button type="button" disabled={pending} className="w-fit rounded border border-amber-300 px-4 py-2 text-sm text-amber-900" onClick={() => void run("reopen_rejected")}>
          Reopen as draft
        </button>
      ) : null}

      {mode === "edit" &&
      canDelete &&
      (initial?.status === "unpublished" || initial?.status === "rejected") ? (
        <button
          type="button"
          disabled={pending}
          className="w-fit rounded border border-red-300 px-4 py-2 text-sm text-red-800"
          onClick={() => void run("delete")}
        >
          Delete permanently
        </button>
      ) : null}
    </div>
  );
}
