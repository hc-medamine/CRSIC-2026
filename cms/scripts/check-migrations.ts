import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  try {
    const tables = (
      await pool.query<{ table_name: string }>(
        `SELECT table_name FROM information_schema.tables
         WHERE table_schema = 'public' ORDER BY table_name`,
      )
    ).rows.map((r) => r.table_name);

    const cols = (
      await pool.query<{ column_name: string }>(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'content_items'
         ORDER BY ordinal_position`,
      )
    ).rows.map((r) => r.column_name);

    const hasMigrationsTable = tables.includes("schema_migrations");
    let applied: string[] = [];
    if (hasMigrationsTable) {
      applied = (
        await pool.query<{ filename: string }>(
          `SELECT filename FROM schema_migrations ORDER BY filename`,
        )
      ).rows.map((r) => r.filename);
    }

    const expectedTables = [
      "schema_migrations",
      "users",
      "org_units",
      "user_org_scopes",
      "user_content_scopes",
      "notifications",
      "content_items",
      "content_revisions",
    ];
    const expectedFiles = [
      "001_users.sql",
      "002_org_units.sql",
      "003_user_scopes.sql",
      "004_notifications.sql",
      "005_news_content.sql",
      "006_event_fields.sql",
      "007_publication_fields.sql",
    ];
    const expectedCols = [
      "event_scope",
      "event_day",
      "event_month",
      "event_year",
      "event_type_ar",
      "event_type_en",
      "event_display_status",
      "pub_kind",
    ];

    const missingTables = expectedTables.filter((t) => !tables.includes(t));
    const missingCols = expectedCols.filter((c) => !cols.includes(c));
    const missingFiles = expectedFiles.filter((f) => !applied.includes(f));
    const ok =
      missingTables.length === 0 && missingCols.length === 0 && missingFiles.length === 0;

    console.log("tables:", tables.join(", ") || "(none)");
    console.log("content_items columns:", cols.join(", ") || "(missing table)");
    console.log(
      "schema_migrations:",
      hasMigrationsTable ? applied.join(", ") || "(empty)" : "not present yet",
    );
    console.log("missing tables:", missingTables.length ? missingTables.join(", ") : "none");
    console.log("missing event/pub columns:", missingCols.length ? missingCols.join(", ") : "none");
    console.log("pending migration files:", missingFiles.length ? missingFiles.join(", ") : "none");
    console.log(ok ? "STATUS: ALL APPLIED" : "STATUS: INCOMPLETE");
    process.exit(ok ? 0 : 1);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
