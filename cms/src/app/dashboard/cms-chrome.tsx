"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { CMS_LANG_COOKIE, t, type CmsLang } from "@/lib/i18n/labels";
import type { ContentType } from "@/lib/users";
import {
  IconBell,
  IconDoc,
  IconGlobe,
  IconHome,
  IconMedia,
  IconShield,
  IconUser,
  IconUsers,
} from "./cms-icons";

type NavItem = {
  key: string;
  href: string;
  badge?: number;
  contentType?: ContentType;
  icon?: ReactNode;
};

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
  { key: "news", href: "/dashboard/news", contentType: "news", icon: <IconDoc /> },
  { key: "events", href: "/dashboard/events", contentType: "event", icon: <IconGlobe /> },
  { key: "publications", href: "/dashboard/publications", contentType: "publication", icon: <IconDoc /> },
  { key: "partners", href: "/dashboard/partners", contentType: "partner", icon: <IconUsers /> },
  { key: "alerts", href: "/dashboard/alerts", contentType: "alert", icon: <IconBell /> },
];

const RESEARCH: NavItem[] = [
  { key: "researchGroups", href: "/dashboard/research-groups", contentType: "research_group", icon: <IconUsers /> },
  { key: "researchProjects", href: "/dashboard/research-projects", contentType: "research_project", icon: <IconDoc /> },
];

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-crs-muted">
      {children}
    </p>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
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
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
          active
            ? "bg-crs-primary/10 font-semibold text-crs-primary"
            : "text-crs-ink/75 hover:bg-crs-bg hover:text-crs-ink"
        }`}
        aria-current={active ? "page" : undefined}
        onClick={() => setMenuOpen(false)}
      >
        {active ? (
          <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-crs-primary" aria-hidden />
        ) : null}
        <span className={`shrink-0 ${active ? "text-crs-primary" : "text-crs-muted"}`}>
          {item.icon ?? <IconDoc />}
        </span>
        <span className="flex-1 truncate">{t(item.key, lang)}</span>
        {item.badge && item.badge > 0 ? (
          <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
            {item.badge}
          </span>
        ) : null}
      </Link>
    );
  }

  const utility: NavItem[] = [];
  if (showMedia) utility.push({ key: "media", href: "/dashboard/media", icon: <IconMedia /> });
  utility.push(
    { key: "notifications", href: "/dashboard/notifications", badge: unread, icon: <IconBell /> },
    { key: "profile", href: "/dashboard/profile", icon: <IconUser /> },
  );

  const adminItems: NavItem[] = [];
  if (role === "super_admin") {
    adminItems.push(
      { key: "users", href: "/dashboard/users", icon: <IconUsers /> },
      { key: "orgUnits", href: "/dashboard/org-units", icon: <IconShield /> },
      { key: "editors", href: "/dashboard/editors", icon: <IconUsers /> },
      { key: "audit", href: "/dashboard/audit", icon: <IconShield /> },
    );
  } else if (role === "reviewer") {
    adminItems.push({ key: "editors", href: "/dashboard/editors", icon: <IconUsers /> });
  }

  const roleLabel =
    role === "super_admin" ? "Super Admin" : role === "reviewer" ? "Reviewer" : "Editor";

  const navBody = (
    <>
      <NavLink item={{ key: "home", href: "/dashboard", icon: <IconHome /> }} />

      {centreItems.length > 0 ? (
        <>
          <GroupLabel>{t("centreContent", lang)}</GroupLabel>
          {centreItems.map((item) => (
            <NavLink key={item.key} item={item} />
          ))}
        </>
      ) : null}

      {researchItems.length > 0 ? (
        <>
          <GroupLabel>{t("research", lang)}</GroupLabel>
          {researchItems.map((item) => (
            <NavLink key={item.key} item={item} />
          ))}
        </>
      ) : null}

      {utility.length > 0 ? (
        <>
          <div className="mx-3 my-3 border-t border-crs-border" />
          {utility.map((item) => (
            <NavLink key={item.key} item={item} />
          ))}
        </>
      ) : null}

      {adminItems.length > 0 ? (
        <>
          <GroupLabel>{t("admin", lang)}</GroupLabel>
          {adminItems.map((item) => (
            <NavLink key={item.key} item={item} />
          ))}
        </>
      ) : null}
    </>
  );

  return (
    <div dir={dir} lang={lang} className="min-h-full bg-[#f3f2ed]">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-crs-border bg-crs-surface/95 px-4 backdrop-blur md:hidden">
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-crs-border text-sm text-crs-ink hover:bg-crs-bg"
          aria-expanded={menuOpen}
          aria-controls="cms-sidebar"
          onClick={() => setMenuOpen((o) => !o)}
        >
          {menuOpen ? t("menuClose", lang) : t("menuOpen", lang)}
        </button>
        <span className="text-sm font-semibold text-crs-ink">CRSIC</span>
        <button
          type="button"
          onClick={toggleLang}
          className="ms-auto min-h-11 rounded-xl border border-crs-border px-3 text-xs text-crs-ink hover:bg-crs-bg"
          aria-label="Toggle language / direction"
        >
          {t("langToggle", lang)}
        </button>
      </header>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-crs-ink/40 md:hidden"
          aria-label={t("menuClose", lang)}
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="flex min-h-[calc(100vh-3.5rem)] md:min-h-screen">
        <aside
          id="cms-sidebar"
          className={`fixed inset-y-0 start-0 z-40 flex h-dvh max-h-dvh w-[17rem] flex-col border-e border-crs-border bg-crs-surface shadow-[1px_0_0_rgba(26,46,38,0.03)] transition-transform md:sticky md:top-0 md:z-0 md:h-screen md:max-h-screen md:translate-x-0 md:self-start ${
            menuOpen ? "translate-x-0" : "-translate-x-full rtl:translate-x-full md:translate-x-0"
          }`}
        >
          <div className="hidden shrink-0 items-center gap-3 px-5 py-5 md:flex">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-crs-primary text-sm font-bold text-white shadow-sm"
              aria-hidden
            >
              C
            </span>
            <div>
              <p className="text-[15px] font-semibold tracking-tight text-crs-ink">CRSIC</p>
              <p className="text-[11px] text-crs-muted">Content CMS</p>
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2" aria-label="Main">
            {navBody}
          </nav>

          <div className="shrink-0 border-t border-crs-border p-3">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crs-primary/15 text-xs font-semibold text-crs-primary">
                {initials(displayName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-crs-ink">{displayName}</p>
                <p className="truncate text-[11px] text-crs-muted">{roleLabel}</p>
              </div>
            </div>
            <p className="sr-only">{email}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={toggleLang}
                className="hidden min-h-10 flex-1 rounded-xl border border-crs-border text-xs text-crs-ink hover:bg-crs-bg md:inline-flex md:items-center md:justify-center"
                aria-label="Toggle language / direction"
              >
                {t("langToggle", lang)}
              </button>
              <button
                type="button"
                onClick={logout}
                disabled={pending}
                className="min-h-10 flex-1 rounded-xl border border-crs-border text-xs text-crs-ink hover:bg-crs-bg disabled:opacity-60"
              >
                {t("logout", lang)}
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 bg-[#f3f2ed]">{children}</div>
      </div>
    </div>
  );
}
