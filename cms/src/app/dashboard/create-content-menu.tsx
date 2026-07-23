"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export type CreateOption = { href: string; label: string };

type Props = {
  options: CreateOption[];
  /** Button label when multiple options (dropdown). */
  menuLabel: string;
};

/**
 * Single create link, or a dropdown when the user can create multiple content types.
 */
export function CreateContentMenu({ options, menuLabel }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (options.length === 0) return null;

  if (options.length === 1) {
    const only = options[0]!;
    return (
      <Link
        href={only.href}
        className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 py-2.5 text-sm text-crs-ink hover:bg-crs-bg"
      >
        {menuLabel}: {only.label}
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-crs-border bg-crs-surface px-4 py-2.5 text-sm text-crs-ink hover:bg-crs-bg"
      >
        {menuLabel}
        <span className="text-crs-muted" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul
          role="menu"
          className="absolute end-0 z-20 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-crs-border bg-crs-surface py-1 shadow-lg"
        >
          {options.map((opt) => (
            <li key={opt.href} role="none">
              <Link
                role="menuitem"
                href={opt.href}
                className="block px-4 py-2.5 text-sm text-crs-ink hover:bg-crs-bg"
                onClick={() => setOpen(false)}
              >
                {opt.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
