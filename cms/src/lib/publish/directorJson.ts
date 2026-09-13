import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { ensureWebpForContentRow } from "@/lib/media/publishImages";
import { webpPathIfExists } from "@/lib/media/webp";
export type PublicDirector = {
  quote_ar: string;
  quote_en: string;
  name_ar: string;
  name_en: string;
  role_ar: string;
  role_en: string;
  portrait: string;
  portrait_webp?: string;
  portrait_alt_ar?: string;
  portrait_alt_en?: string;
};

type DirectorPayloadSource = {
  quote_ar: string;
  quote_en: string;
  name_ar: string;
  name_en: string;
  role_ar: string;
  role_en: string;
  portrait_path: string | null;
  portrait_alt_ar: string | null;
  portrait_alt_en: string | null;
};

export function buildDirectorPayload(row: DirectorPayloadSource): PublicDirector {
  const portrait = row.portrait_path?.trim() || "";
  if (!portrait) throw new Error("Portrait path is required");
  const item: PublicDirector = {
    quote_ar: row.quote_ar.trim(),
    quote_en: row.quote_en.trim(),
    name_ar: row.name_ar.trim(),
    name_en: row.name_en.trim() || row.name_ar.trim(),
    role_ar: row.role_ar.trim(),
    role_en: row.role_en.trim() || row.role_ar.trim(),
    portrait,
  };
  if (row.portrait_alt_ar?.trim()) item.portrait_alt_ar = row.portrait_alt_ar.trim();
  if (row.portrait_alt_en?.trim()) item.portrait_alt_en = row.portrait_alt_en.trim();
  const portrait_webp = webpPathIfExists(portrait);
  if (portrait_webp) item.portrait_webp = portrait_webp;
  return item;
}

export async function writePublicDirectorJsonAsync(
  row: DirectorPayloadSource,
): Promise<{ path: string }> {
  await ensureWebpForContentRow({ portrait_path: row.portrait_path });
  return writePublicDirectorJson(row);
}

function publicDirectorPath(): string {
  return join(process.cwd(), "..", "data", "director.json");
}

export function writePublicDirectorJson(row: DirectorPayloadSource): { path: string } {
  const payload = buildDirectorPayload(row);
  const path = publicDirectorPath();
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  renameSync(tmp, path);
  return { path };
}
