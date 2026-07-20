import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { ProfileForm } from "./profile-form";

type ProfileRow = {
  email: string;
  display_name: string;
  name_ar: string | null;
  name_en: string | null;
  role: string;
};

export default async function ProfilePage() {
  const sessionUser = await requireUser().catch(() => null);
  if (!sessionUser) redirect("/login");

  const result = await query<ProfileRow>(
    `SELECT email, display_name, name_ar, name_en, role
     FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
    [sessionUser.id],
  );
  const row = result.rows[0];
  if (!row) redirect("/login");

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-12 font-sans">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-zinc-500">CRSIC CMS · Step 2</p>
          <h1 className="text-2xl font-semibold text-zinc-900">My profile</h1>
          <p className="mt-1 text-sm text-zinc-600">
            You can edit your name. Role and scopes are managed by Super Admin only.
          </p>
        </div>
        <Link href="/dashboard" className="text-sm underline">
          ← Dashboard
        </Link>
      </header>

      <ProfileForm
        initial={{
          email: row.email,
          displayName: row.display_name,
          nameAr: row.name_ar ?? "",
          nameEn: row.name_en ?? "",
          role: row.role,
        }}
      />
    </main>
  );
}
