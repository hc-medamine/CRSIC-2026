import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { query } from "@/lib/db";
import { CMS_LANG_COOKIE, normalizeLang, t } from "@/lib/i18n/labels";
import { PageBreadcrumb } from "@/app/dashboard/ui-bits";
import { ProfileForm } from "./profile-form";
import { AwayPanel } from "@/app/dashboard/away-panel";

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
  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-8 font-sans lg:px-10">
      <PageBreadcrumb
        items={[
          { href: "/dashboard", label: t("home", lang) },
          { label: t("profile", lang) },
        ]}
      />
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-crs-ink">{t("profile", lang)}</h1>
        <p className="mt-1 text-sm text-crs-muted">
          You can edit your name. Role and scopes are managed by Super Admin only.
        </p>
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

      <AwayPanel canManage={row.role === "reviewer"} />
    </main>
  );
}
