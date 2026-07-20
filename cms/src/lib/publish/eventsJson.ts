import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { query } from "@/lib/db";

export type PublicEventItem = {
  day: string;
  month: string;
  year: string;
  title: string;
  type: string;
  status: "done" | "upcoming";
  img?: string;
};

/** Public item plus the scope used to bucket it into intl/nat on rebuild. */
export type StoredEventPayload = PublicEventItem & { scope: "intl" | "nat" };

type PayloadSource = {
  title_ar: string;
  event_day: string | null;
  event_month: string | null;
  event_year: string | null;
  event_type_ar: string | null;
  event_display_status: "upcoming" | "done" | null;
  event_scope: "intl" | "nat" | null;
  image_path: string | null;
};

/** P1 public object for an event row (persisted to content_items.live_payload). */
export function buildEventPayload(row: PayloadSource): StoredEventPayload {
  const item: StoredEventPayload = {
    day: row.event_day?.trim() || "01",
    month: row.event_month?.trim() || "",
    year: row.event_year?.trim() || "",
    title: row.title_ar.trim(),
    type: row.event_type_ar?.trim() || "فعالية",
    status: row.event_display_status === "done" ? "done" : "upcoming",
    scope: row.event_scope === "nat" ? "nat" : "intl",
  };
  if (row.image_path) item.img = row.image_path;
  return item;
}

function publicEventsPath(): string {
  return join(process.cwd(), "..", "data", "events.json");
}

/**
 * Emits every event row whose live_payload is set (published, or under revision with the
 * public copy still live), split into intl/nat by the scope captured at publish time.
 */
export async function rebuildPublicEventsJson(): Promise<{ intl: number; nat: number; path: string }> {
  const result = await query<{ live_payload: StoredEventPayload }>(
    `SELECT live_payload
     FROM content_items
     WHERE content_type = 'event' AND live_payload IS NOT NULL
     ORDER BY live_at DESC NULLS LAST, updated_at DESC`,
  );

  const intl: PublicEventItem[] = [];
  const nat: PublicEventItem[] = [];

  for (const row of result.rows) {
    const { scope, ...item } = row.live_payload;
    const publicItem: PublicEventItem = {
      day: item.day?.trim() || "01",
      month: item.month?.trim() || "",
      year: item.year?.trim() || "",
      title: (item.title ?? "").trim(),
      type: item.type?.trim() || "فعالية",
      status: item.status === "done" ? "done" : "upcoming",
    };
    if (item.img) publicItem.img = item.img;
    if (scope === "nat") nat.push(publicItem);
    else intl.push(publicItem);
  }

  const path = publicEventsPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));

  const payload = JSON.stringify({ intl, nat }, null, 4);
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  renameSync(tmp, path);

  const check = JSON.parse(readFileSync(path, "utf8")) as { intl: unknown; nat: unknown };
  if (!Array.isArray(check.intl) || !Array.isArray(check.nat)) {
    throw new Error("Published events.json invalid after write");
  }

  return { intl: intl.length, nat: nat.length, path };
}
