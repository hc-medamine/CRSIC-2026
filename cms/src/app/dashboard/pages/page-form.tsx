"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ItemWorkflowMeta, type PersonDisplay } from "@/app/dashboard/item-workflow-meta";
import { PAGE_FIELD_KEYS, PAGE_KEYS, PAGE_KEY_LABELS, type PageKey } from "@/lib/content/pageKeys";

type OrgUnit = { id: string; name_ar: string; name_en: string };
type PageFields = { ar: Record<string, string>; en: Record<string, string> };

type Initial = {
  id?: string;
  orgUnitId: string;
  pageKey: PageKey;
  titleAr: string;
  titleEn: string;
  enStatus: "pending" | "ready";
  pageFields: PageFields;
  status?: string;
  reviewNote?: string | null;
  editor?: PersonDisplay;
  reviewer?: PersonDisplay;
  publisher?: PersonDisplay;
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

export function PageEditorForm({
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
  const [pageKey, setPageKey] = useState<PageKey>(initial?.pageKey ?? PAGE_KEYS[0]);
  const [enStatus, setEnStatus] = useState<"pending" | "ready">(initial?.enStatus ?? "pending");
  const [ar, setAr] = useState<Record<string, string>>(initial?.pageFields.ar ?? {});
  const [en, setEn] = useState<Record<string, string>>(initial?.pageFields.en ?? {});
  const [checklist, setChecklist] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const editable = mode === "create" || initial?.status === "draft" || initial?.status === "changes_requested";
  const fieldKeys = PAGE_FIELD_KEYS[mode === "create" ? pageKey : (initial?.pageKey ?? pageKey)];

  function fields() {
    return { orgUnitId, enStatus, pageFields: { ar, en } };
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgUnitId, pageKey, enStatus, pageFields: { ar, en } }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; item?: { id: string } };
      if (!res.ok || !data.ok || !data.item) {
        setError(data.error ?? "Create failed");
        return;
      }
      router.push(`/dashboard/pages/${data.item.id}`);
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
      const res = await fetch(`/api/pages/${initial.id}`, {
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
        router.push("/dashboard/pages");
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

        {mode === "create" ? (
          <label className="text-sm">
            <span className="font-medium">Page *</span>
            <select
              value={pageKey}
              onChange={(e) => setPageKey(e.target.value as PageKey)}
              className="mt-1 w-full rounded border px-3 py-2"
            >
              {PAGE_KEYS.map((k) => (
                <option key={k} value={k}>
                  {PAGE_KEY_LABELS[k].en} ({PAGE_KEY_LABELS[k].ar})
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm">
            <span className="font-medium">Page: </span>
            {initial ? `${PAGE_KEY_LABELS[initial.pageKey].en} (${PAGE_KEY_LABELS[initial.pageKey].ar})` : ""}
          </p>
        )}

        <label className="text-sm">
          <span className="font-medium">EN status</span>
          <select
            disabled={!editable}
            value={enStatus}
            onChange={(e) => setEnStatus(e.target.value as "pending" | "ready")}
            className="mt-1 w-full max-w-xs rounded border px-3 py-2"
          >
            <option value="pending">pending</option>
            <option value="ready">ready</option>
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 border-b border-zinc-200 pb-1 text-sm font-semibold text-zinc-900">
              AR (العربية)
            </legend>
            {fieldKeys.map((key) => (
              <label key={key} className="text-xs">
                <span className="font-mono text-[11px] text-zinc-500">{key}</span>
                <textarea
                  dir="rtl"
                  disabled={!editable}
                  value={ar[key] ?? ""}
                  onChange={(e) => setAr((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  rows={2}
                />
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 border-b border-zinc-200 pb-1 text-sm font-semibold text-zinc-900">EN</legend>
            {fieldKeys.map((key) => (
              <label key={key} className="text-xs">
                <span className="font-mono text-[11px] text-zinc-500">{key}</span>
                <textarea
                  disabled={!editable}
                  value={en[key] ?? ""}
                  onChange={(e) => setEn((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="mt-1 w-full rounded border px-2 py-1 text-sm"
                  rows={2}
                />
              </label>
            ))}
          </fieldset>
        </div>

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
          Publish to public site-copy.json
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
