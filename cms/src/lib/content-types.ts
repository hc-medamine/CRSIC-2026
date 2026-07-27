/**
 * Content-type enums/constants — safe for Client Components.
 * Keep server-only user/session logic in `@/lib/users`.
 */

export type ContentType =
  | "news"
  | "event"
  | "publication"
  | "partner"
  | "alert"
  | "research_group"
  | "research_project"
  | "law"
  | "platform";

/** Centre-wide SPA section types — globally exclusive across orgs and editors. */
export const SPA_CONTENT_TYPES: ContentType[] = [
  "news",
  "event",
  "publication",
  "partner",
  "alert",
  "law",
  "platform",
];

/** Research-dept types — exclusive per org among editors; allowed on every research_dept. */
export const RESEARCH_CONTENT_TYPES: ContentType[] = [
  "research_group",
  "research_project",
];

export const ALL_CONTENT_TYPES: ContentType[] = [
  ...SPA_CONTENT_TYPES,
  ...RESEARCH_CONTENT_TYPES,
];

export function isSpaContentType(t: ContentType): boolean {
  return (SPA_CONTENT_TYPES as string[]).includes(t);
}

export function isResearchContentType(t: ContentType): boolean {
  return (RESEARCH_CONTENT_TYPES as string[]).includes(t);
}
