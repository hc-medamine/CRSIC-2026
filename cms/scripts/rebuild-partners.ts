/**
 * Safe partner JSON cutover: backup → rebuild from live_payload → validate.
 *
 * Usage (from cms/): npm run db:rebuild:partners
 */
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { pool } from "../src/lib/db";
import {
  rebuildPublicPartnersJson,
  type PublicPartnerItem,
} from "../src/lib/publish/partnersJson";

type PartnersFile = {
  intl: PublicPartnerItem[];
  nat: PublicPartnerItem[];
};

type ValidationIssue = { level: "error" | "warn"; message: string };

function publicPartnersPath(): string {
  return join(process.cwd(), "..", "data", "partners.json");
}

function mediaExists(img: string): boolean {
  const rel = img.replace(/^\//, "");
  const candidates = [
    join(process.cwd(), "..", rel),
    join(process.cwd(), "..", "public", rel),
    join(process.cwd(), "public", rel),
  ];
  return candidates.some((p) => existsSync(p));
}

function validate(file: PartnersFile): {
  issues: ValidationIssue[];
  summary: Record<string, unknown>;
} {
  const issues: ValidationIssue[] = [];
  const all = [...(file.intl ?? []), ...(file.nat ?? [])];
  const slugs = new Map<string, string>();
  let withImg = 0;
  let missingRequired = 0;

  for (const [i, item] of all.entries()) {
    const label = `partners[${i}]`;
    if (!item?.id?.trim()) {
      issues.push({ level: "error", message: `${label}: missing id` });
      missingRequired += 1;
    }
    if (!item?.slug?.trim()) {
      issues.push({ level: "error", message: `${label}: missing slug` });
      missingRequired += 1;
    }
    if (!item?.name?.trim()) {
      issues.push({ level: "error", message: `${label}: missing name` });
      missingRequired += 1;
    }
    if (typeof item.country !== "string") {
      issues.push({ level: "error", message: `${label}: missing country` });
    }
    if (typeof item.date !== "string") {
      issues.push({ level: "error", message: `${label}: missing date` });
    }

    const slug = item.slug?.trim();
    if (slug) {
      const prev = slugs.get(slug);
      if (prev) {
        issues.push({
          level: "error",
          message: `duplicate slug "${slug}" (${prev} and ${item.id})`,
        });
      } else {
        slugs.set(slug, item.id);
      }
    }

    if (item.img?.trim()) {
      withImg += 1;
      if (!mediaExists(item.img.trim())) {
        issues.push({
          level: "error",
          message: `${label} (${item.id}): img not found on disk: ${item.img}`,
        });
      }
    }
  }

  return {
    issues,
    summary: {
      total: all.length,
      intl: file.intl?.length ?? 0,
      nat: file.nat?.length ?? 0,
      uniqueSlugs: slugs.size,
      withImg,
      missingRequired,
      errorCount: issues.filter((i) => i.level === "error").length,
      warnCount: issues.filter((i) => i.level === "warn").length,
    },
  };
}

function countPartnersInFile(filePath: string): number {
  if (!existsSync(filePath)) return 0;
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as PartnersFile;
    return (parsed.intl?.length ?? 0) + (parsed.nat?.length ?? 0);
  } catch {
    return 0;
  }
}

async function main() {
  const path = publicPartnersPath();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = join(process.cwd(), "tmp", "partners-backups");
  if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });

  const priorCount = countPartnersInFile(path);
  let backupPath: string | null = null;
  if (existsSync(path)) {
    backupPath = join(backupDir, `partners.${stamp}.json`);
    copyFileSync(path, backupPath);
    console.log(`Backup written: ${backupPath} (${priorCount} partners)`);
  } else {
    console.log("No existing partners.json — skipping backup");
  }

  const rebuild = await rebuildPublicPartnersJson();
  console.log(`Rebuilt: ${rebuild.path} (intl=${rebuild.intl}, nat=${rebuild.nat})`);

  // Safety: never leave an empty public file when the previous file had partners
  // and the CMS had nothing to publish (missing import / live_payload).
  if (rebuild.intl + rebuild.nat === 0 && priorCount > 0 && backupPath) {
    copyFileSync(backupPath, path);
    console.error(
      `\nREFUSED empty cutover: CMS published 0 partners but previous file had ${priorCount}.`,
    );
    console.error(`Restored backup → ${path}`);
    console.error(
      "Import partners into CMS first: npm run db:import-legacy -- --partners-only",
    );
    await pool.end();
    process.exit(1);
  }

  const parsed = JSON.parse(readFileSync(path, "utf8")) as PartnersFile;
  const { issues, summary } = validate(parsed);

  const report = {
    generatedAt: new Date().toISOString(),
    backupPath,
    rebuild,
    summary,
    issues,
    sampleSlugs: [...(parsed.intl ?? []), ...(parsed.nat ?? [])]
      .slice(0, 10)
      .map((p) => ({ id: p.id, slug: p.slug, name: p.name, img: p.img ?? null })),
    smokeRoutes: [...(parsed.intl ?? []), ...(parsed.nat ?? [])].map(
      (p) => `#partner/${encodeURIComponent(p.slug)}`,
    ),
  };

  const reportPath = join(process.cwd(), "tmp", `partners-rebuild-${stamp}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`Validation summary: ${JSON.stringify(summary, null, 2)}`);
  console.log(`Report written: ${reportPath}`);

  if ((summary.errorCount as number) > 0) {
    console.error("\nValidation FAILED:");
    for (const issue of issues.filter((i) => i.level === "error")) {
      console.error(`- ${issue.message}`);
    }
    await pool.end();
    process.exit(1);
  }

  console.log("\nValidation OK.");
  console.log(`Smoke ${report.smokeRoutes.length} partner route(s):`);
  for (const route of report.smokeRoutes.slice(0, 20)) console.log(`  ${route}`);
  if (report.smokeRoutes.length > 20) {
    console.log(`  … and ${report.smokeRoutes.length - 20} more (see report)`);
  }

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
