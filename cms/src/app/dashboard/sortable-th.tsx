"use client";

import type { ReactNode } from "react";
import { IconChevron } from "@/app/dashboard/cms-icons";
import {
  ariaSortValue,
  type HeaderSort,
  type SortKind,
} from "@/lib/content/headerSort";
import { tf, type CmsLang } from "@/lib/i18n/labels";

export function SortableTh({
  label,
  sortKey,
  kind,
  sort,
  lang,
  className = "px-4 py-3.5 font-semibold",
  align = "start",
  children,
  onToggle,
}: {
  label: string;
  sortKey: string;
  kind: SortKind;
  sort: HeaderSort | null;
  lang: CmsLang;
  className?: string;
  align?: "start" | "center" | "end";
  children?: ReactNode;
  onToggle: (key: string, kind: SortKind) => void;
}) {
  const active = sort?.key === sortKey;
  const justify = align === "center" ? "justify-center" : align === "end" ? "justify-end" : "justify-start";
  return (
    <th aria-sort={ariaSortValue(sort, sortKey)} className={className}>
      <button
        type="button"
        className={`inline-flex min-h-11 w-full items-center gap-1 text-inherit hover:text-crs-ink ${justify}`}
        aria-label={tf("sortByColumn", lang, { col: label })}
        onClick={() => onToggle(sortKey, kind)}
      >
        <span>{children ?? label}</span>
        {active ? (
          <IconChevron
            className={`h-3.5 w-3.5 shrink-0 ${sort?.dir === "asc" ? "-rotate-90" : "rotate-90"}`}
          />
        ) : null}
      </button>
    </th>
  );
}
