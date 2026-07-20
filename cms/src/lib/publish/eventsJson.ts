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

type PublishedRow = {
  title_ar: string;
  event_day: string | null;
  event_month: string | null;
  event_year: string | null;
  event_type_ar: string | null;
  event_display_status: "upcoming" | "done" | null;
  event_scope: "intl" | "nat" | null;
  image_path: string | null;
  published_at: Date | null;
};

function publicEventsPath(): string {
  return join(process.cwd(), "..", "data", "events.json");
}

export async function rebuildPublicEventsJson(): Promise<{ intl: number; nat: number; path: string }> {
  const result = await query<PublishedRow>(
    `SELECT title_ar, event_day, event_month, event_year, event_type_ar,
            event_display_status, event_scope, image_path, published_at
     FROM content_items
     WHERE content_type = 'event' AND status = 'published'
     ORDER BY event_year DESC NULLS LAST, event_month DESC NULLS LAST, event_day DESC NULLS LAST, published_at DESC`,
  );

  const intl: PublicEventItem[] = [];
  const nat: PublicEventItem[] = [];

  for (const row of result.rows) {
    const item: PublicEventItem = {
      day: row.event_day?.trim() || "01",
      month: row.event_month?.trim() || "",
      year: row.event_year?.trim() || "",
      title: row.title_ar.trim(),
      type: row.event_type_ar?.trim() || "فعالية",
      status: row.event_display_status === "done" ? "done" : "upcoming",
    };
    if (row.image_path) item.img = row.image_path;
    if (row.event_scope === "nat") nat.push(item);
    else intl.push(item);
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
