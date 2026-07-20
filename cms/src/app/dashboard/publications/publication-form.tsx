"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MediaUploadField } from "@/app/dashboard/media-upload-field";
import { PublishPreview } from "@/app/dashboard/publish-preview";

type OrgUnit = { id: string; name_ar: string; name_en: string };

type Initial = {
  id?: string;
  orgUnitId: string;
  titleAr: string;
  titleEn: string;
  deptAr: string;
  deptEn: string;
  descAr: string;
  descEn: string;
  coverPath: string;
  coverMediaId?: string | null;
  imageAltAr: string;
  imageAltEn: string;
  enStatus: "pending" | "ready";
  pubKind: "collective" | "individual";
  status?: string;
  reviewNote?: string | null;
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

export function PublicationEditorForm({
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
  const [deptAr, setDeptAr] = useState(initial?.deptAr ?? "");
  const [deptEn, setDeptEn] = useState(initial?.deptEn ?? "");
  const [descAr, setDescAr] = useState(initial?.descAr ?? "");
  const [descEn, setDescEn] = useState(initial?.descEn ?? "");
  const [coverPath, setCoverPath] = useState(initial?.coverPath ?? "");
  const [coverMediaId, setCoverMediaId] = useState(initial?.coverMediaId ?? null);
  const [imageAltAr, setImageAltAr] = useState(initial?.imageAltAr ?? "");
  const [imageAltEn, setImageAltEn] = useState(initial?.imageAltEn ?? "");
  const [enStatus, setEnStatus] = useState<"pending" | "ready">(initial?.enStatus ?? "pending");
  const [pubKind, setPubKind] = useState<"collective" | "individual">(
    initial?.pubKind ?? "collective",
  );
  const [checklist, setChecklist] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const editable =
    mode === "create" || initial?.status === "draft" || initial?.status === "changes_requested";

  function fields() {
    return {
      orgUnitId,
      titleAr,
      titleEn,
      deptAr,
      deptEn,
      descAr,
      descEn,
      coverPath: coverPath.trim(),
      imageAltAr,
      imageAltEn,
      enStatus,
      pubKind,
    };
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/publications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields()),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; item?: { id: string } };
      if (!res.ok || !data.ok || !data.item) {
        setError(data.error ?? "Create failed");
        return;
      }
      router.push(`/dashboard/publications/${data.item.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function run(action: string, extra?: Record<string, unknown>) {
    if (!initial?.id) return;
    if (action === "delete") {
      const ok = window.confirm(
        "Permanently delete this item? This cannot be undone.",
      );
      if (!ok) return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/publications/${initial.id}`, {
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
        router.push("/dashboard/publications");
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
        <p className="text-sm text-zinc-600">
          Status: <strong>{initial.status}</strong>
          {initial.reviewNote ? ` — ${initial.reviewNote}` : ""}
        </p>
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
          <span className="font-medium">Type *</span>
          <select
            disabled={!editable}
            value={pubKind}
            onChange={(e) => setPubKind(e.target.value as "collective" | "individual")}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="collective">collective</option>
            <option value="individual">individual</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="font-medium">Title (AR) *</span>
          <input
            dir="rtl"
            required
            disabled={!editable}
            value={titleAr}
            onChange={(e) => setTitleAr(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Department (AR) *</span>
          <input
            dir="rtl"
            required
            disabled={!editable}
            value={deptAr}
            onChange={(e) => setDeptAr(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="الحضارة الإسلامية"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Description (AR) *</span>
          <textarea
            dir="rtl"
            required
            disabled={!editable}
            value={descAr}
            onChange={(e) => setDescAr(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            rows={3}
          />
        </label>
        <MediaUploadField
          bucket="covers"
          publicPath={coverPath}
          mediaId={coverMediaId}
          disabled={!editable}
          imagesOnly
          label="Cover image *"
          onUploaded={({ publicPath, mediaId }) => {
            setCoverPath(publicPath);
            setCoverMediaId(mediaId);
          }}
        />
        <label className="text-sm">
          <span className="font-medium">Cover alt (AR) *</span>
          <input
            dir="rtl"
            disabled={!editable}
            value={imageAltAr}
            onChange={(e) => setImageAltAr(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Title (EN)</span>
          <input
            disabled={!editable}
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Department (EN)</span>
          <input
            disabled={!editable}
            value={deptEn}
            onChange={(e) => setDeptEn(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Description (EN)</span>
          <textarea
            disabled={!editable}
            value={descEn}
            onChange={(e) => setDescEn(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            rows={2}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">EN status</span>
          <select
            disabled={!editable}
            value={enStatus}
            onChange={(e) => setEnStatus(e.target.value as "pending" | "ready")}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="pending">pending</option>
            <option value="ready">ready</option>
          </select>
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {message ? <p className="text-sm text-green-700">{message}</p> : null}

        <div className="flex flex-wrap gap-2">
          {mode === "create" ? (
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
            >
              {pending ? "Saving…" : "Create draft"}
            </button>
          ) : null}
          {mode === "edit" && editable && isAuthor ? (
            <>
              <button
                type="button"
                disabled={pending}
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white"
                onClick={() => void run("save", { fields: fields() })}
              >
                Save draft
              </button>
              {canSubmit ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checklist}
                    onChange={(e) => setChecklist(e.target.checked)}
                  />
                  Checklist OK
                </label>
              ) : null}
              {canSubmit ? (
                <button
                  type="button"
                  disabled={pending || !checklist}
                  className="rounded border px-4 py-2 text-sm disabled:opacity-60"
                  onClick={() => void run("submit", { checklistConfirmed: checklist })}
                >
                  Submit for review
                </button>
              ) : null}
            </>
          ) : null}
          {mode === "edit" && initial?.status === "submitted" && isAuthor ? (
            <button
              type="button"
              disabled={pending}
              className="rounded border px-4 py-2 text-sm"
              onClick={() => void run("withdraw")}
            >
              Withdraw
            </button>
          ) : null}
        </div>
      </form>

      {mode === "edit" && canReview && initial?.status === "submitted" ? (
        <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium">Reviewer actions</p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note for changes / rejection"
            className="w-full rounded border px-3 py-2 text-sm"
            rows={2}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white"
              onClick={() => void run("approve")}
            >
              Approve
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded border px-3 py-1.5 text-sm"
              onClick={() => void run("request_changes", { note })}
            >
              Request changes
            </button>
            <button
              type="button"
              disabled={pending}
              className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700"
              onClick={() => void run("reject", { note })}
            >
              Reject
            </button>
          </div>
        </div>
      ) : null}

      {mode === "edit" ? (
        <PublishPreview
          kind="publication"
          cover={coverPath.trim()}
          title={titleAr}
          type={pubKind}
          dept={deptAr}
          desc={descAr}
        />
      ) : null}

      {mode === "edit" &&
      canReview &&
      (initial?.status === "approved" || initial?.status === "unpublished") ? (
        <button
          type="button"
          disabled={pending}
          className="w-fit rounded bg-emerald-700 px-4 py-2 text-sm text-white"
          onClick={() => void run("publish")}
        >
          Publish to public publications.json
        </button>
      ) : null}

      {mode === "edit" && (isAuthor || canReview) && initial?.status === "published" ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            className="w-fit rounded border border-emerald-300 px-4 py-2 text-sm text-emerald-800"
            onClick={() => void run("start_revision")}
          >
            Create revision (public stays live)
          </button>
          {canReview ? (
            <button
              type="button"
              disabled={pending}
              className="w-fit rounded border px-4 py-2 text-sm"
              onClick={() => void run("unpublish")}
            >
              Unpublish
            </button>
          ) : null}
        </div>
      ) : null}

      {mode === "edit" && isAuthor && initial?.status === "rejected" ? (
        <button
          type="button"
          disabled={pending}
          className="w-fit rounded border border-amber-300 px-4 py-2 text-sm text-amber-900"
          onClick={() => void run("reopen_rejected")}
        >
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
