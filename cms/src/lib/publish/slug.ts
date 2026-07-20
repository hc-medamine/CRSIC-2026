/** Arabic-friendly slug for public hash routes (#news/{slug}, …). */

export function slugifyTitle(title: string): string {
  const base = title
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  // Lowercase only affects Latin segments; Arabic unchanged.
  return (base || "item").replace(/[A-Za-z]+/g, (m) => m.toLowerCase());
}

/** Ensure uniqueness within a set of already-used slugs. */
export function uniqueSlug(base: string, used: Set<string>): string {
  let candidate = base || "item";
  if (!used.has(candidate)) return candidate;
  let n = 2;
  while (used.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
