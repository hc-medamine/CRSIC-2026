import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";
import { DEFAULT_CONTACT, pickLocaleFields } from "../src/lib/content/sitePageKeys";

async function seedSitePagesIfMissing(pool: Pool) {
  const table = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'site_pages'
     ) AS exists`,
  );
  if (!table.rows[0]?.exists) return;

  const existing = await pool.query(`SELECT id FROM site_pages WHERE id = 1`);
  if (existing.rows[0]) {
    console.log("Skip site_pages seed (row exists)");
    return;
  }

  const arPath = join(process.cwd(), "..", "data", "locales", "ar.json");
  const enPath = join(process.cwd(), "..", "data", "locales", "en.json");
  if (!existsSync(arPath) || !existsSync(enPath)) {
    console.warn("Skip site_pages seed (locale files missing)");
    return;
  }
  const ar = JSON.parse(readFileSync(arPath, "utf8")) as Record<string, unknown>;
  const en = JSON.parse(readFileSync(enPath, "utf8")) as Record<string, unknown>;
  await pool.query(
    `INSERT INTO site_pages (
      id, fields_ar, fields_en, email, phone, webmail_url, webmail_text, updated_at
    ) VALUES (1, $1::jsonb, $2::jsonb, $3, $4, $5, $6, NOW())
    ON CONFLICT (id) DO NOTHING`,
    [
      JSON.stringify(pickLocaleFields(ar)),
      JSON.stringify(pickLocaleFields(en)),
      DEFAULT_CONTACT.email,
      DEFAULT_CONTACT.phone,
      DEFAULT_CONTACT.webmail_url,
      DEFAULT_CONTACT.webmail_text,
    ],
  );
  console.log("Seeded site_pages from locales");
}

async function ensureMigrationsTable(pool: Pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function appliedSet(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<{ filename: string }>(
    `SELECT filename FROM schema_migrations`,
  );
  return new Set(result.rows.map((r) => r.filename));
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const dir = join(process.cwd(), "sql");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  try {
    await ensureMigrationsTable(pool);
    const done = await appliedSet(pool);
    let appliedCount = 0;

    for (const file of files) {
      if (done.has(file)) {
        console.log(`Skip ${file} (already applied)`);
        continue;
      }
      const sql = readFileSync(join(dir, file), "utf8");
      console.log(`Applying ${file}…`);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [file]);
        await client.query("COMMIT");
        appliedCount += 1;
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    }

    if (appliedCount === 0) {
      console.log("Migrations up to date.");
    } else {
      console.log(`Migrations complete (${appliedCount} new).`);
    }

    await seedSitePagesIfMissing(pool);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
