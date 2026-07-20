import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const pool = new Pool({ connectionString: url });
  try {
    const users = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE role = 'super_admin'`,
    );
    const orgs = await pool.query<{ id: string }>(`SELECT id FROM org_units`);
    for (const user of users.rows) {
      for (const org of orgs.rows) {
        await pool.query(
          `INSERT INTO user_org_scopes (user_id, org_unit_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [user.id, org.id],
        );
      }
      for (const t of ["news", "event", "publication"] as const) {
        await pool.query(
          `INSERT INTO user_content_scopes (user_id, content_type) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [user.id, t],
        );
      }
    }
    console.log(`Scoped ${users.rowCount} super_admin user(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
