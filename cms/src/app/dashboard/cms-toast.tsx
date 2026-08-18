"use client";

import { useEffect, useState } from "react";
import { t, type CmsLang } from "@/lib/i18n/labels";

export type ToastKind = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
};

const AUTO_DISMISS_MS = 3800;
const EXIT_MS = 260;
const MAX_VISIBLE = 4;

type ToastState = { item: ToastItem; leaving: boolean };

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
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const [docLang, setDocLang] = useState<CmsLang>("en");

  useEffect(() => {
    const read = () =>
      setDocLang(document.documentElement.lang === "ar" ? "ar" : "en");
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => obs.disconnect();
  }, []);

  const dismiss = (id: string) => {
    setToasts((prev) => prev.map((s) => (s.item.id === id ? { ...s, leaving: true } : s)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((s) => s.item.id !== id));
    }, EXIT_MS);
  };

  useEffect(() => {
    return subscribe((item) => {
      setToasts((prev) => [{ item, leaving: false }, ...prev].slice(0, MAX_VISIBLE));
      window.setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS);
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setToasts((prev) => {
          const newest = prev[0];
          if (newest && !newest.leaving) {
            dismiss(newest.item.id);
          }
          return prev;
        });
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-3 z-[200] flex flex-col items-center gap-2 px-4"
      aria-live="polite"
      aria-relevant="additions"
    >
      {toasts.map(({ item, leaving }) => {
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
            className={`pointer-events-auto relative flex w-full max-w-md items-start gap-3 overflow-hidden rounded-xl border px-4 py-3 text-sm shadow-lg ${
              leaving ? "cms-toast-leave" : "cms-toast-enter"
            } ${tone}`}
          >
            <p className="min-w-0 flex-1 font-medium leading-snug">{item.message}</p>
            <button
              type="button"
              className="shrink-0 rounded-lg px-2 py-0.5 text-xs opacity-80 hover:opacity-100"
              aria-label={t("dismiss", docLang)}
              onClick={() => dismiss(item.id)}
            >
              ×
            </button>
            {!leaving ? (
              <span
                className="cms-toast-progress"
                style={{ animationDuration: `${AUTO_DISMISS_MS}ms` }}
                aria-hidden
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
