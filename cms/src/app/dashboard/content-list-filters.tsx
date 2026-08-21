"use client";

import { IconSearch } from "@/app/dashboard/cms-icons";
import { useCmsLang } from "@/lib/i18n/cms-lang";
import { statusLabel, t } from "@/lib/i18n/labels";

type Props = {
  q?: string;
  status?: string;
  placeholder?: string;
};

/** Shared GET search + status filter bar (News / Events / Publications). */
export function ContentListFilters({
  q = "",
  status = "",
  placeholder,
}: Props) {
  const lang = useCmsLang();
  const statusOptions: { value: string; label: string }[] = [
    { value: "", label: t("filterAllStatus", lang) },
    { value: "draft", label: statusLabel("draft", lang) },
    { value: "submitted", label: statusLabel("submitted", lang) },
    { value: "changes_requested", label: statusLabel("changes_requested", lang) },
    { value: "approved", label: statusLabel("approved", lang) },
    { value: "published", label: statusLabel("published", lang) },
    { value: "unpublished", label: statusLabel("unpublished", lang) },
    { value: "rejected", label: statusLabel("rejected", lang) },
  ];

  return (
    <form className="flex flex-wrap items-center gap-3" method="get">
      <label className="relative min-w-[16rem] flex-1">
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-crs-muted">
          <IconSearch className="h-4 w-4" />
        </span>
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={placeholder ?? t("filterSearch", lang)}
          className="min-h-11 w-full rounded-xl border border-crs-border bg-crs-surface pe-3 ps-10 text-sm text-crs-ink outline-none focus-visible:border-crs-accent focus-visible:ring-2 focus-visible:ring-crs-accent/30"
        />
      </label>
      <select
        name="status"
        defaultValue={status}
        className="min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 text-sm text-crs-ink outline-none focus-visible:border-crs-accent focus-visible:ring-2 focus-visible:ring-crs-accent/30"
      >
        {statusOptions.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 text-sm font-medium text-crs-ink hover:bg-crs-bg"
      >
        {t("filterApply", lang)}
      </button>
    </form>
  );
}
