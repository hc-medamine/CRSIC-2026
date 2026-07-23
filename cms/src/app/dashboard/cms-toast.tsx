"use client";

import { useEffect, useState } from "react";

export type ToastKind = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

const AUTO_DISMISS_MS = 3800;
const MAX_VISIBLE = 4;

type Listener = (item: ToastItem) => void;
const listeners = new Set<Listener>();

function push(kind: ToastKind, message: string) {
  const text = message.trim();
  if (!text) return;
  const item: ToastItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    message: text,
  };
  listeners.forEach((l) => l(item));
}

/** Imperative toast API — call from any client mutate handler. */
export const cmsToast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
  info: (message: string) => push("info", message),
};

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Fixed top toast host. Mount once in the root layout.
 * Toasts auto-dismiss; Escape dismisses the newest.
 */
export function CmsToastHost() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return subscribe((item) => {
      setItems((prev) => [item, ...prev].slice(0, MAX_VISIBLE));
      window.setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
      }, AUTO_DISMISS_MS);
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setItems((prev) => prev.slice(1));
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[200] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
      aria-relevant="additions"
    >
      {items.map((item) => {
        const tone =
          item.kind === "success"
            ? "border-crs-secondary/40 bg-crs-primary text-white"
            : item.kind === "error"
              ? "border-red-300 bg-red-600 text-white"
              : "border-crs-border bg-crs-surface text-crs-ink";
        return (
          <div
            key={item.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${tone}`}
          >
            <p className="min-w-0 flex-1 font-medium leading-snug">{item.message}</p>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-0.5 text-xs opacity-80 hover:opacity-100"
              aria-label="Dismiss"
              onClick={() => setItems((prev) => prev.filter((t) => t.id !== item.id))}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
