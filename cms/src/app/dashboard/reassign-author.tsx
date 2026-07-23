"use client";

import { useEffect, useState } from "react";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { useRouter } from "next/navigation";

type ContentType =
  | "news"
  | "event"
  | "publication"
  | "partner"
  | "alert"
  | "research_group"
  | "research_project";

type AssignableUser = { id: string; display_name: string; email: string; role: string };

type Props = {
  contentItemId: string;
  contentType: ContentType;
  currentAuthorId: string;
};

function apiSegment(type: ContentType): string {
  if (type === "news") return "news";
  if (type === "event") return "events";
  if (type === "publication") return "publications";
  if (type === "partner") return "partners";
  if (type === "research_group") return "research-groups";
  if (type === "research_project") return "research-projects";
  return "alerts";
}

export function ReassignAuthor({ contentItemId, contentType, currentAuthorId }: Props) {
  const router = useRouter();
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [target, setTarget] = useState<string>("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch("/api/content/assignable-users");
      const data = (await res.json()) as { ok: boolean; users?: AssignableUser[] };
      if (!cancelled && data.ok && data.users) setUsers(data.users);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reassign() {
    if (!target) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/${apiSegment(contentType)}/${contentItemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reassign", newUserId: target }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        const msg = data.error ?? "Reassign failed";
        setError(msg);
        cmsToast.error(msg);
        return;
      }
      setMessage("Author reassigned.");
      cmsToast.success("Author reassigned.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-2 rounded-2xl border border-crs-border bg-crs-surface p-4 shadow-sm">
      <h2 className="text-lg font-medium text-crs-ink">Reassign author</h2>
      <p className="text-xs text-crs-muted">
        Move this item to another active user (draft / changes requested / submitted only). Audited
        as <code>content.reassign</code>. Reviewers may assign to Editors or Reviewers; only Super
        Admin may assign to a Super Admin.
      </p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink"
        >
          <option value="">— select user —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id} disabled={u.id === currentAuthorId}>
              {u.display_name} ({u.role}){u.id === currentAuthorId ? " — current" : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending || !target}
          onClick={() => void reassign()}
          className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-3 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-60"
        >
          {pending ? "Reassigning…" : "Reassign"}
        </button>
      </div>
    </section>
  );
}
