/** Server-safe list filtering (must not live in a `"use client"` module). */
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
