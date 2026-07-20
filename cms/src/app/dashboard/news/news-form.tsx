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
  labelAr: string;
  labelEn: string;
  summaryAr: string;
  summaryEn: string;
  bodyAr: string;
  bodyEn: string;
  imagePath: string;
  imageMediaId?: string | null;
  imageAltAr: string;
  imageAltEn: string;
  enStatus: "pending" | "ready";
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
  currentUserId?: string;
};

export function NewsEditorForm({
  mode,
  orgUnits,
  initial,
  canSubmit,
  canReview,
  isAuthor,
}: Props) {
  const router = useRouter();
  const [orgUnitId, setOrgUnitId] = useState(initial?.orgUnitId ?? orgUnits[0]?.id ?? "");
  const [titleAr, setTitleAr] = useState(initial?.titleAr ?? "");
  const [titleEn, setTitleEn] = useState(initial?.titleEn ?? "");
  const [labelAr, setLabelAr] = useState(initial?.labelAr ?? "");
  const [labelEn, setLabelEn] = useState(initial?.labelEn ?? "");
  const [summaryAr, setSummaryAr] = useState(initial?.summaryAr ?? "");
  const [summaryEn, setSummaryEn] = useState(initial?.summaryEn ?? "");
  const [bodyAr, setBodyAr] = useState(initial?.bodyAr ?? "");
  const [bodyEn, setBodyEn] = useState(initial?.bodyEn ?? "");
  const [imagePath, setImagePath] = useState(initial?.imagePath ?? "");
  const [imageMediaId, setImageMediaId] = useState(initial?.imageMediaId ?? null);
  const [imageAltAr, setImageAltAr] = useState(initial?.imageAltAr ?? "");
  const [imageAltEn, setImageAltEn] = useState(initial?.imageAltEn ?? "");
  const [enStatus, setEnStatus] = useState<"pending" | "ready">(initial?.enStatus ?? "pending");
  const [checklist, setChecklist] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const editable =
    mode === "create" ||
    initial?.status === "draft" ||
    initial?.status === "changes_requested";

  function fields() {
    return {
      orgUnitId,
      titleAr,
      titleEn,
      labelAr,
      labelEn,
      summaryAr,
      summaryEn,
      bodyAr,
      bodyEn,
      imagePath: imagePath.trim() || null,
      imageAltAr,
      imageAltEn,
      enStatus,
    };
  }

  async function create(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields()),
      });
      const data = (await res.json()) as { ok: boolean; error?: string; item?: { id: string } };
      if (!res.ok || !data.ok || !data.item) {
        setError(data.error ?? "Create failed");
        return;
      }
      router.push(`/dashboard/news/${data.item.id}`);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function run(action: string, extra?: Record<string, unknown>) {
    if (!initial?.id) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/news/${initial.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Action failed");
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
          <span className="font-medium">Title (EN)</span>
          <input
            disabled={!editable}
            value={titleEn}
            onChange={(e) => setTitleEn(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-medium">Label (AR)</span>
            <input
              dir="rtl"
              disabled={!editable}
              value={labelAr}
              onChange={(e) => setLabelAr(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="font-medium">Label (EN)</span>
            <input
              disabled={!editable}
              value={labelEn}
              onChange={(e) => setLabelEn(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2"
            />
          </label>
        </div>
        <label className="text-sm">
          <span className="font-medium">Summary (AR)</span>
          <textarea
            dir="rtl"
            disabled={!editable}
            value={summaryAr}
            onChange={(e) => setSummaryAr(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            rows={2}
          />
        </label>
        <label className="text-sm">
          <span className="font-medium">Body (AR)</span>
          <textarea
            dir="rtl"
            disabled={!editable}
            value={bodyAr}
            onChange={(e) => setBodyAr(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            rows={4}
          />
        </label>
        <MediaUploadField
          bucket="news"
          publicPath={imagePath}
          mediaId={imageMediaId}
          disabled={!editable}
          imagesOnly
          label="News image"
          onUploaded={({ publicPath, mediaId }) => {
            setImagePath(publicPath);
            setImageMediaId(mediaId);
          }}
        />
        <label className="text-sm">
          <span className="font-medium">Image alt (AR)</span>
          <input
            dir="rtl"
            disabled={!editable}
            value={imageAltAr}
            onChange={(e) => setImageAltAr(e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
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
                className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-60"
                onClick={() => void run("save", { fields: fields() })}
              >
                Save draft
              </button>
              {canSubmit ? (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={checklist} onChange={(e) => setChecklist(e.target.checked)} />
                  Checklist OK (names, dates, no private data, photo rights)
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
          kind="news"
          img={imagePath.trim()}
          label={labelAr}
          title={titleAr}
        />
      ) : null}

      {mode === "edit" && canReview && (initial?.status === "approved" || initial?.status === "unpublished") ? (
        <button
          type="button"
          disabled={pending}
          className="w-fit rounded bg-emerald-700 px-4 py-2 text-sm text-white"
          onClick={() => void run("publish")}
        >
          Publish to public news.json
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
    </div>
  );
}
