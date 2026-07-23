"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CMS_LANG_COOKIE, t, type CmsLang } from "@/lib/i18n/labels";
import type { ContentType } from "@/lib/users";

type NavItem = { key: string; href: string; badge?: number; contentType?: ContentType };

type Props = {
  initialLang: CmsLang;
  role: "super_admin" | "editor" | "reviewer";
  contentTypes: ContentType[];
  showMedia: boolean;
  unread: number;
  displayName: string;
  email: string;
  children: React.ReactNode;
};

const CENTRE: NavItem[] = [
  { key: "news", href: "/dashboard/news", contentType: "news" },
  { key: "events", href: "/dashboard/events", contentType: "event" },
  { key: "publications", href: "/dashboard/publications", contentType: "publication" },
  { key: "partners", href: "/dashboard/partners", contentType: "partner" },
  { key: "alerts", href: "/dashboard/alerts", contentType: "alert" },
];

const RESEARCH: NavItem[] = [
  { key: "researchGroups", href: "/dashboard/research-groups", contentType: "research_group" },
  { key: "researchProjects", href: "/dashboard/research-projects", contentType: "research_project" },
];

function linkClass(active: boolean) {
  return active
    ? "font-medium text-zinc-900 underline underline-offset-4"
    : "text-zinc-600 hover:text-zinc-900";
}

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 text-[11px] font-semibold tracking-wide text-zinc-500">
      {children}
    </span>
  );
}

function NavGroup({
  label,
  children,
  divided,
}: {
  label?: string;
  children: React.ReactNode;
  divided?: boolean;
}) {
  return (
    <span
      className={`flex flex-wrap items-center gap-x-2.5 gap-y-1 ${
        divided ? "border-s border-zinc-200 ps-3" : ""
      }`}
    >
      {label ? <GroupLabel>{label}</GroupLabel> : null}
      {children}
    </span>
  );
}

export function CmsChrome({
  initialLang,
  role,
  contentTypes,
  showMedia,
  unread,
  displayName,
  email,
  children,
}: Props) {
  const [lang, setLang] = useState<CmsLang>(initialLang);
  const [pending, setPending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const allowed = useMemo(() => new Set(contentTypes), [contentTypes]);

  const centreItems = useMemo(
    () => CENTRE.filter((i) => i.contentType && allowed.has(i.contentType)),
    [allowed],
  );
  const researchItems = useMemo(
    () => RESEARCH.filter((i) => i.contentType && allowed.has(i.contentType)),
    [allowed],
  );

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

  function NavLink({ item }: { item: NavItem }) {
    return (
      <Link
        href={item.href}
        className={linkClass(isActive(item.href))}
        onClick={() => setMenuOpen(false)}
      >
        {t(item.key, lang)}
        {item.badge && item.badge > 0 ? (
          <span className="ms-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white">
            {item.badge}
          </span>
        ) : null}
      </Link>
    );
  }

  const utility: NavItem[] = [];
  if (showMedia) utility.push({ key: "media", href: "/dashboard/media" });
  utility.push(
    { key: "notifications", href: "/dashboard/notifications", badge: unread },
    { key: "profile", href: "/dashboard/profile" },
  );

  const adminItems: NavItem[] = [];
  if (role === "super_admin") {
    adminItems.push(
      { key: "users", href: "/dashboard/users" },
      { key: "orgUnits", href: "/dashboard/org-units" },
      { key: "editors", href: "/dashboard/editors" },
      { key: "audit", href: "/dashboard/audit" },
    );
  } else if (role === "reviewer") {
    adminItems.push({ key: "editors", href: "/dashboard/editors" });
  }

  const contentNav = (
    <>
      <NavLink item={{ key: "home", href: "/dashboard" }} />

      {centreItems.length > 0 ? (
        <NavGroup label={t("centreContent", lang)} divided>
          {centreItems.map((item) => (
            <NavLink key={item.key} item={item} />
          ))}
        </NavGroup>
      ) : null}

      {researchItems.length > 0 ? (
        <NavGroup label={t("research", lang)} divided>
          {researchItems.map((item) => (
            <NavLink key={item.key} item={item} />
          ))}
        </NavGroup>
      ) : null}
    </>
  );

  const toolsNav = (
    <>
      {utility.length > 0 ? (
        <NavGroup divided={false}>
          {utility.map((item) => (
            <NavLink key={item.key} item={item} />
          ))}
        </NavGroup>
      ) : null}

      {adminItems.length > 0 ? (
        <NavGroup label={t("admin", lang)} divided={utility.length > 0}>
          {adminItems.map((item) => (
            <NavLink key={item.key} item={item} />
          ))}
        </NavGroup>
      ) : null}
    </>
  );

  return (
    <div dir={dir} lang={lang} className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="text-sm font-semibold text-zinc-900">CRSIC CMS</span>

            <button
              type="button"
              className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50 md:hidden"
              aria-expanded={menuOpen}
              aria-controls="cms-main-nav"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {menuOpen ? t("menuClose", lang) : t("menuOpen", lang)}
            </button>

            {/* Desktop: content types stay on the primary row */}
            <nav className="hidden items-center gap-x-3 gap-y-1 text-sm md:flex md:flex-wrap">
              {contentNav}
            </nav>

            <div className="ms-auto flex items-center gap-2">
              <span className="hidden text-xs text-zinc-500 sm:inline">
                {t("signedInAs", lang)}{" "}
                <span className="font-medium text-zinc-700">{displayName}</span>
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

          {/* Desktop: utilities + Admin on a quieter second row */}
          {(utility.length > 0 || adminItems.length > 0) && (
            <nav className="mt-1.5 hidden items-center gap-x-3 gap-y-1 border-t border-zinc-100 pt-1.5 text-sm md:flex md:flex-wrap">
              {toolsNav}
            </nav>
          )}

          {/* Mobile accordion */}
          <nav
            id="cms-main-nav"
            className={`${
              menuOpen ? "flex" : "hidden"
            } mt-2 w-full flex-col gap-2 border-t border-zinc-100 pt-2 text-sm md:hidden`}
          >
            {contentNav}
            {toolsNav}
          </nav>
        </div>
        <span className="sr-only">{email}</span>
      </header>
      {children}
    </div>
  );
}
