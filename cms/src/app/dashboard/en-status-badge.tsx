"use client";

import { useCmsLang } from "@/lib/i18n/cms-lang";
import { t } from "@/lib/i18n/labels";

/** Visual EN pending / ready badge (PRD D — authoring quality pack). */
export function EnStatusBadge({
  status,
}: {
  status: "pending" | "ready" | string | null | undefined;
}) {
  const lang = useCmsLang();
  if (!status) return null;
  const pending = status === "pending";
  return (
    <span
      className={
        pending
          ? "inline-flex rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium tracking-wide text-amber-900"
          : "inline-flex rounded bg-crs-primary/15 px-2 py-0.5 text-[11px] font-medium tracking-wide text-crs-primary"
      }
    >
      {pending ? t("enPending", lang) : t("enReady", lang)}
    </span>
  );
}
