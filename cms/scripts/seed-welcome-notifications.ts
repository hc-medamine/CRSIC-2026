import { Pool } from "pg";

/** One-time welcome notice so the notifications UI is testable before content workflows. */
async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const pool = new Pool({ connectionString: url });
  try {
    const users = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE is_active = TRUE`,
    );
    for (const user of users.rows) {
      const existing = await pool.query(
        `SELECT 1 FROM notifications
         WHERE user_id = $1 AND type = 'system.welcome' LIMIT 1`,
        [user.id],
      );
      if (existing.rowCount && existing.rowCount > 0) continue;
      await pool.query(
        `INSERT INTO notifications (user_id, type, title, body, link_path)
         VALUES ($1, 'system.welcome', $2, $3, $4)`,
        [
          user.id,
          "Welcome to CRSIC CMS",
          "In-app notifications are ready. Review and publish events will appear here later. No email is sent.",
          "/dashboard/notifications",
        ],
      );
    }
    console.log(`Welcome notifications ensured for ${users.rowCount} user(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
