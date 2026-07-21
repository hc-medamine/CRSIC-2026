"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
      if (!res.ok) return;
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function markRead(id: string) {
    await patch({ action: "mark_read", id });
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
    setUnread((u) => Math.max(0, u - 1));
  }

  async function markAll() {
    await patch({ action: "mark_all_read" });
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnread(0);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          Unread: <span className="font-medium text-zinc-900">{unread}</span>
        </p>
        <button
          type="button"
          disabled={pending || unread === 0}
          onClick={() => void markAll()}
          className="rounded border border-zinc-300 px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Mark all read
        </button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500">
          No notifications yet. Submit / review / publish events will create them in later steps.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border border-zinc-200 bg-white shadow-sm">
          {items.map((n) => (
            <li
              key={n.id}
              className={`flex flex-col gap-1 px-4 py-3 ${n.readAt ? "bg-white" : "bg-zinc-50"}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-zinc-900">{n.title}</p>
                  {n.body ? <p className="mt-1 text-sm text-zinc-600">{n.body}</p> : null}
                  <p className="mt-1 text-xs text-zinc-400">
                    {n.type} · {formatDateTime(n.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  {n.linkPath ? (
                    <Link href={n.linkPath} className="text-xs underline">
                      Open
                    </Link>
                  ) : null}
                  {!n.readAt ? (
                    <button
                      type="button"
                      disabled={pending}
                      className="text-xs underline"
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
