import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { getNavContentTypes } from "@/lib/content/permissions";
import { canManageDirector } from "@/lib/content/director";
import { countUnread } from "@/lib/notifications";
import { refreshUserFromDb } from "@/lib/content/ooo";
import { CMS_LANG_COOKIE, normalizeLang, localizedDisplayName } from "@/lib/i18n/labels";
import { SessionTouch } from "./session-touch";
import { CmsChrome } from "./cms-chrome";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user: SessionUser;
  try {
    const sessionUser = await requireUser();
    user = (await refreshUserFromDb(sessionUser.id)) ?? sessionUser;
  } catch {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const [unread, contentTypes, showDirector] = await Promise.all([
    countUnread(user.id),
    getNavContentTypes(user),
    canManageDirector(user),
  ]);
  const showMedia =
    user.role === "super_admin" ||
    user.role === "editor" ||
    user.role === "reviewer";
  const displayName = localizedDisplayName(
    {
      displayName: user.displayName,
      nameAr: user.nameAr,
      nameEn: user.nameEn,
    },
    lang,
  );

  return (
    <>
      <SessionTouch />
      <CmsChrome
        initialLang={lang}
        role={user.role}
        contentTypes={contentTypes}
        showMedia={showMedia}
        showDirector={showDirector}
        unread={unread}
        displayName={displayName}
        email={user.email}
      >
        {children}
      </CmsChrome>
    </>
  );
}
