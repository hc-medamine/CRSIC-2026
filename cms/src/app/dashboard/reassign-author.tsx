"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ContentType = "news" | "event" | "publication";

type AssignableUser = { id: string; display_name: string; email: string; role: string };

type Props = {
  contentItemId: string;
  contentType: ContentType;
  currentAuthorId: string;
};

function apiSegment(type: ContentType): string {
  if (type === "news") return "news";
  if (type === "event") return "events";
  return "publications";
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
        setError(data.error ?? "Reassign failed");
        return;
      }
      setMessage("Author reassigned.");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="grid gap-2 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <h2 className="text-lg font-medium text-zinc-900">Reassign author</h2>
      <p className="text-xs text-zinc-500">
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
          className="rounded border px-3 py-2 text-sm"
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
          className="rounded border px-3 py-2 text-sm disabled:opacity-60"
        >
          {pending ? "Reassigning…" : "Reassign"}
        </button>
      </div>
    </section>
  );
}
