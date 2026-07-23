"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cmsToast } from "@/app/dashboard/cms-toast";
import { formatDateTime } from "@/lib/format-datetime";

type Item = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  linkPath: string | null;
  readAt: string | null;
  createdAt: string;
};

type Props = {
  initialUnread: number;
  initialItems: Item[];
};

export function NotificationsClient({ initialUnread, initialItems }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [unread, setUnread] = useState(initialUnread);
  const [pending, setPending] = useState(false);

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        cmsToast.error("Could not update notification.");
        return false;
      }
      router.refresh();
      return true;
    } finally {
      setPending(false);
    }
  }

  async function markRead(id: string) {
    const ok = await patch({ action: "mark_read", id });
    if (!ok) return;
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnread((u) => Math.max(0, u - 1));
    cmsToast.success("Marked as read.");
  }

  async function markAll() {
    const ok = await patch({ action: "mark_all_read" });
    if (!ok) return;
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnread(0);
    cmsToast.success("All marked as read.");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-crs-muted">
          Unread: <span className="font-medium text-crs-ink">{unread}</span>
        </p>
        <button
          type="button"
          disabled={pending || unread === 0}
          onClick={() => void markAll()}
          className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-4 py-2 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-crs-border bg-white p-6 text-sm text-crs-muted">
          No notifications yet. Submit / review / publish events will create them in later steps.
        </p>
      ) : (
        <ul className="divide-y rounded-2xl border border-crs-border bg-crs-surface shadow-sm">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex flex-col gap-1 px-4 py-3 ${n.readAt ? "bg-white" : "bg-crs-bg"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-crs-ink">{n.title}</p>
                  {n.body ? <p className="mt-1 text-sm text-crs-muted">{n.body}</p> : null}
                  <p className="mt-1 text-xs text-crs-muted">
                    {n.type} · {formatDateTime(n.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {n.linkPath ? (
                    <Link
                      href={n.linkPath}
                      className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-crs-primary hover:bg-crs-bg"
                    >
                      Open
                    </Link>
                  ) : null}
                  {!n.readAt ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="inline-flex min-h-11 items-center rounded-lg border border-crs-border bg-crs-surface px-3 text-sm text-crs-ink hover:bg-crs-bg disabled:opacity-50"
                      onClick={() => void markRead(n.id)}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
