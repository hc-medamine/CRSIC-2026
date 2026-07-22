"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemWorkflowMeta, type PersonDisplay } from "@/app/dashboard/item-workflow-meta";
import {
  SeoFieldsSection,
  copyMetaTitleFrom,
  copyMetaDescriptionFrom,
  emptySeoFormState,
  type SeoFormState,
} from "@/app/dashboard/seo-fields";

type OrgUnit = { id: string; name_ar: string; name_en: string };

type MemberRow = { nameAr: string; nameEn: string };

type Initial = {
  id?: string;
  orgUnitId: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  leadAr: string;
  leadEn: string;
  members: MemberRow[];
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
  canSubmit?: boolean;
  canReview?: boolean;
  isAuthor?: boolean;
  canDelete?: boolean;
};

function emptyMember(): MemberRow {
  return { nameAr: "", nameEn: "" };
}

export function ResearchGroupForm({
  mode,
  orgUnits,
  initial,
  canSubmit,
  canReview,
  isAuthor,
  canDelete,
}: Props) {
  const router = useRouter();
  const [orgUnitId, setOrgUnitId] = useState(initial?.orgUnitId ?? orgUnits[0]?.id ?? "");
  const [titleAr, setTitleAr] = useState(initial?.titleAr ?? "");
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? "");
  const [summaryAr, setSummaryAr] = useState(initial?.summaryAr ?? "");
  const [summaryEn, setSummaryEn] = useState(initial?.summaryEn ?? "");
  const [leadAr, setLeadAr] = useState(initial?.leadAr ?? "");
  const [leadEn, setLeadEn] = useState(initial?.leadEn ?? "");
  const [members, setMembers] = useState<MemberRow[]>(
    initial?.members && initial.members.length > 0 ? initial.members : [emptyMember()],
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

  function updateMember(index: number, patch: Partial<MemberRow>) {
    setMembers((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }

  function addMember() {
    setMembers((prev) => [...prev, emptyMember()]);
  }

  function removeMember(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  function fields() {
    return {
      orgUnitId,
      titleAr,
      titleEn,
      summaryAr,
      summaryEn,
      leadAr,
      leadEn,
      members: members
        .filter((m) => m.nameAr.trim())
        .map((m) => ({ nameAr: m.nameAr, nameEn: m.nameEn })),
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
      const res = await fetch("/api/research-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields()),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; item?: { id: string } };
      if (!res.ok || !data.ok || !data.item) {
        setError(data.error ?? "Create failed");
        return;
      }
      router.push(`/dashboard/research-groups/${data.item.id}`);
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
      const res = await fetch(`/api/research-groups/${initial.id}`, {
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
        router.push("/dashboard/research-groups");
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
            onChange={(e) => setOrgUnitId(e.target.value)}
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
          <span className="font-medium">Group name (AR) *</span>
          <input dir="rtl" required disabled={!editable} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="font-medium">Group name (EN)</span>
          <input disabled={!editable} value={titleEn} onChange={(e) => setTitleEn(e.target.value)} className="mt-1 w-full rounded border px-3 py-2" />
        </label>

        <label className="text-sm">
          <span className="font-medium">Summary (AR) *</span>
          <textarea dir="rtl" disabled={!editable} value={summaryAr} onChange={(e) => setSummaryAr(e.target.value)} rows={3} className="mt-1 w-full rounded border px-3 py-2" />
        </label>
        <label className="text-sm">
          <span className="font-medium">Summary (EN)</span>
          <textarea disabled={!editable} value={summaryEn} onChange={(e) => setSummaryEn(e.target.value)} rows={3} className="mt-1 w-full rounded border px-3 py-2" />
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

        <fieldset className="grid gap-2 rounded border border-zinc-200 bg-zinc-50/80 p-3">
          <legend className="px-1 text-sm font-semibold text-zinc-900">Members</legend>
          {members.map((m, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <input
                dir="rtl"
                disabled={!editable}
                placeholder="Name (AR)"
                value={m.nameAr}
                onChange={(e) => updateMember(i, { nameAr: e.target.value })}
                className="rounded border px-3 py-2 text-sm"
              />
              <input
                disabled={!editable}
                placeholder="Name (EN)"
                value={m.nameEn}
                onChange={(e) => updateMember(i, { nameEn: e.target.value })}
                className="rounded border px-3 py-2 text-sm"
              />
              {editable ? (
                <button
                  type="button"
                  onClick={() => removeMember(i)}
                  className="rounded border border-red-300 px-3 py-2 text-xs text-red-700"
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {editable ? (
            <button type="button" onClick={addMember} className="w-fit text-xs underline">
              + Add member
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
          onCopySummaryAr={() => setSeo((s) => copyMetaDescriptionFrom(summaryAr, s))}
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}

        <div className="flex flex-wrap gap-2">
          {mode === "create" ? (
            <button type="submit" disabled={pending} className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60">
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
          Publish to public research-groups.json
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
