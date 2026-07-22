import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireUser, type SessionUser } from "@/lib/auth/session";
import { getNavContentTypes } from "@/lib/content/permissions";
import { countUnread } from "@/lib/notifications";
import { CMS_LANG_COOKIE, normalizeLang } from "@/lib/i18n/labels";
import { SessionTouch } from "./session-touch";
import { CmsChrome } from "./cms-chrome";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user: SessionUser;
  try {
    user = await requireUser();
  } catch {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const lang = normalizeLang(cookieStore.get(CMS_LANG_COOKIE)?.value);
  const [unread, contentTypes] = await Promise.all([
    countUnread(user.id),
    getNavContentTypes(user),
  ]);
  const showMedia = user.role === "super_admin";

  return (
    <>
      <SessionTouch />
      <CmsChrome
        initialLang={lang}
        role={user.role}
        contentTypes={contentTypes}
        showMedia={showMedia}
        unread={unread}
        displayName={user.displayName}
        email={user.email}
      >
        {children}
      </CmsChrome>
    </>
  );
}
