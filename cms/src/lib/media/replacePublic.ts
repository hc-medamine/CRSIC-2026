type PublicReplaceRef = {
  status: string;
  source: string;
};

/** True when replacing the file would change the public site (same URL). */
export function mediaReplaceAffectsPublic(refs: PublicReplaceRef[]): boolean {
  return refs.some((r) => r.status === "published" || r.source === "live_payload");
}
