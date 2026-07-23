import { IconSearch } from "@/app/dashboard/cms-icons";

const STATUS_OPTIONS = [
  { value: "", label: "All status" },
  { value: "draft", label: "Draft" },
  { value: "submitted", label: "Submitted" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "unpublished", label: "Unpublished" },
  { value: "rejected", label: "Rejected" },
] as const;

type Props = {
  q?: string;
  status?: string;
  placeholder?: string;
};

/** Shared GET search + status filter bar (News / Events / Publications). */
export function ContentListFilters({
  q = "",
  status = "",
  placeholder = "Search…",
}: Props) {
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
          placeholder={placeholder}
          className="min-h-11 w-full rounded-xl border border-crs-border bg-crs-surface pe-3 ps-10 text-sm text-crs-ink"
        />
      </label>
      <select
        name="status"
        defaultValue={status}
        className="min-h-11 rounded-xl border border-crs-border bg-crs-surface px-3 text-sm text-crs-ink"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value || "all"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="inline-flex min-h-11 items-center rounded-xl border border-crs-border bg-crs-surface px-4 text-sm text-crs-ink hover:bg-crs-bg"
      >
        Filter
      </button>
    </form>
  );
}

export function filterContentItems<
  T extends { title_ar: string; title_en: string | null; status: string },
>(items: T[], q: string, statusFilter: string): T[] {
  let next = items;
  if (statusFilter) {
    next = next.filter((i) => i.status === statusFilter);
  }
  const needle = q.trim().toLowerCase();
  if (needle) {
    next = next.filter(
      (i) =>
        i.title_ar.toLowerCase().includes(needle) ||
        (i.title_en ?? "").toLowerCase().includes(needle) ||
        i.status.toLowerCase().includes(needle),
    );
  }
  return next;
}
