"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { CMS_LANG_COOKIE, t, type CmsLang } from "@/lib/i18n/labels";

type NavItem = { key: string; href: string; badge?: number };

type Props = {
  initialLang: CmsLang;
  role: "super_admin" | "editor" | "reviewer";
  unread: number;
  displayName: string;
  email: string;
  children: React.ReactNode;
};

export function CmsChrome({ initialLang, role, unread, displayName, email, children }: Props) {
  const [lang, setLang] = useState<CmsLang>(initialLang);
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const dir = lang === "ar" ? "rtl" : "ltr";

  const nav: NavItem[] = [
    { key: "dashboard", href: "/dashboard" },
    { key: "news", href: "/dashboard/news" },
    { key: "events", href: "/dashboard/events" },
    { key: "publications", href: "/dashboard/publications" },
    { key: "partners", href: "/dashboard/partners" },
    { key: "alerts", href: "/dashboard/alerts" },
    { key: "media", href: "/dashboard/media" },
    { key: "notifications", href: "/dashboard/notifications", badge: unread },
    { key: "profile", href: "/dashboard/profile" },
  ];
  if (role === "super_admin") {
    nav.push({ key: "users", href: "/dashboard/users" });
    nav.push({ key: "audit", href: "/dashboard/audit" });
  }

  function toggleLang() {
    const next: CmsLang = lang === "ar" ? "en" : "ar";
    setLang(next);
    document.cookie = `${CMS_LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  async function logout() {
    setPending(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  function isActive(href: string): boolean {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div dir={dir} lang={lang} className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2">
          <span className="text-sm font-semibold text-zinc-900">CRSIC CMS</span>
          <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {nav.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className={
                  isActive(item.href)
                    ? "font-medium text-zinc-900 underline underline-offset-4"
                    : "text-zinc-600 hover:text-zinc-900"
                }
              >
                {t(item.key, lang)}
                {item.badge && item.badge > 0 ? (
                  <span className="ms-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <span className="hidden text-xs text-zinc-500 sm:inline">
              {t("signedInAs", lang)} <span className="font-medium text-zinc-700">{displayName}</span>
            </span>
            <button
              type="button"
              onClick={toggleLang}
              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
              aria-label="Toggle language / direction"
            >
              {t("langToggle", lang)}
            </button>
            <button
              type="button"
              onClick={logout}
              disabled={pending}
              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
            >
              {t("logout", lang)}
            </button>
          </div>
        </div>
        <span className="sr-only">{email}</span>
      </header>
      {children}
    </div>
  );
}
