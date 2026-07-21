/** Stable SSR/CSR datetime display — no ICU dateStyle drift between Node and browsers. */
export function formatDateTime(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";

  const pad = (n: number) => String(n).padStart(2, "0");
  const day = pad(d.getUTCDate());
  const month = pad(d.getUTCMonth() + 1);
  const year = d.getUTCFullYear();
  const hour = pad(d.getUTCHours());
  const minute = pad(d.getUTCMinutes());
  const second = pad(d.getUTCSeconds());
  return `${day}/${month}/${year}, ${hour}:${minute}:${second}`;
}
