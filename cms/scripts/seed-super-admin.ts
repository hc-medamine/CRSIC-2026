import bcrypt from "bcryptjs";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  const email = process.env.SEED_SUPER_ADMIN_EMAIL;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const displayName = process.env.SEED_SUPER_ADMIN_DISPLAY_NAME;
  const nameAr = process.env.SEED_SUPER_ADMIN_NAME_AR ?? null;
  const nameEn = process.env.SEED_SUPER_ADMIN_NAME_EN ?? null;

  if (!url || !email || !password || !displayName) {
    console.error(
      "Required: DATABASE_URL, SEED_SUPER_ADMIN_EMAIL, SEED_SUPER_ADMIN_PASSWORD, SEED_SUPER_ADMIN_DISPLAY_NAME",
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString: url });
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, display_name, name_ar, name_en, role)
       VALUES ($1, $2, $3, $4, $5, 'super_admin')
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         display_name = EXCLUDED.display_name,
         name_ar = EXCLUDED.name_ar,
         name_en = EXCLUDED.name_en,
         role = 'super_admin',
         is_active = TRUE,
         updated_at = NOW()
       RETURNING id, email, display_name, role`,
      [email.toLowerCase().trim(), passwordHash, displayName, nameAr, nameEn],
    );
    console.log("Super Admin seeded:", result.rows[0]);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
