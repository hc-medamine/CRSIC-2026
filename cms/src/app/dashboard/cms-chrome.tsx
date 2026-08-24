"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CMS_LANG_COOKIE, roleLabel, t, type CmsLang } from "@/lib/i18n/labels";
import { CmsLangProvider } from "@/lib/i18n/cms-lang";
import type { ContentType } from "@/lib/users";
import {
  IconBell,
  IconChevron,
  IconDoc,
  IconGlobe,
  IconHome,
  IconInbox,
  IconMedia,
  IconSearch,
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
  showDirector: boolean;
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
  { key: "laws", href: "/dashboard/laws", contentType: "law", icon: <IconDoc /> },
  { key: "platforms", href: "/dashboard/platforms", contentType: "platform", icon: <IconGlobe /> },
  { key: "alerts", href: "/dashboard/alerts", contentType: "alert", icon: <IconBell /> },
];

const RESEARCH: NavItem[] = [
  { key: "researchGroups", href: "/dashboard/research-groups", contentType: "research_group", icon: <IconUsers /> },
  { key: "researchProjects", href: "/dashboard/research-projects", contentType: "research_project", icon: <IconDoc /> },
];

function NavGroup({
  label,
  children,
  defaultOpen = true,
}: {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.08em] text-crs-muted transition-colors hover:text-crs-ink"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <IconChevron
          className={`h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${
            open ? "rotate-90 rtl:-rotate-90" : ""
          }`}
          aria-hidden
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function NavLink({
  item,
  active,
  label,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
        active
          ? "cms-nav-active bg-crs-primary/10 font-semibold text-crs-primary"
          : "text-crs-ink/75 hover:bg-crs-bg hover:text-crs-ink"
      }`}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
    >
      {active ? (
        <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-crs-primary" aria-hidden />
      ) : null}
      <span className={`shrink-0 ${active ? "text-crs-primary" : "text-crs-muted"}`}>
        {item.icon ?? <IconDoc />}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {item.badge && item.badge > 0 ? (
        <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export function CmsChrome({
  initialLang,
  role,
  contentTypes,
  showMedia,
  showDirector,
  unread,
  displayName,
  email,
  children,
}: Props) {
  const [lang, setLang] = useState<CmsLang>(initialLang);
  const [pending, setPending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navQuery, setNavQuery] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const dir = lang === "ar" ? "rtl" : "ltr";
  const allowed = useMemo(() => new Set(contentTypes), [contentTypes]);

  /* Single source of truth for document language/direction (AT + CSS :dir). */
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    return () => {
      document.documentElement.lang = "en";
      document.documentElement.dir = "ltr";
    };
  }, [lang, dir]);

  const centreItems = useMemo(() => {
    const items = CENTRE.filter((i) => i.contentType && allowed.has(i.contentType));
    if (allowed.has("news")) {
      const newsIndex = items.findIndex((i) => i.key === "news");
      const insertAt = newsIndex >= 0 ? newsIndex + 1 : items.length;
      items.splice(insertAt, 0, {
        key: "featuredNews",
        href: "/dashboard/featured-news",
        contentType: "news",
        icon: <IconGlobe />,
      });
    }
    return items;
  }, [allowed]);
  const researchItems = useMemo(
    () => RESEARCH.filter((i) => i.contentType && allowed.has(i.contentType)),
    [allowed],
  );

  function toggleLang() {
    const next: CmsLang = lang === "ar" ? "en" : "ar";
    setLang(next);
    setMenuOpen(false);
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

  const utility: NavItem[] = [];
  if (showMedia) utility.push({ key: "media", href: "/dashboard/media", icon: <IconMedia /> });
  if (role === "editor") {
    utility.push({ key: "recycleBin", href: "/dashboard/recycle-bin", icon: <IconInbox /> });
  }
  utility.push(
    { key: "notifications", href: "/dashboard/notifications", badge: unread, icon: <IconBell /> },
    { key: "profile", href: "/dashboard/profile", icon: <IconUser /> },
  );

  const adminItems: NavItem[] = [];
  if (showDirector) {
    adminItems.push({ key: "directorWord", href: "/dashboard/director", icon: <IconUser /> });
  }
  if (role === "super_admin") {
    adminItems.push(
      { key: "users", href: "/dashboard/users", icon: <IconUsers /> },
      { key: "orgUnits", href: "/dashboard/org-units", icon: <IconShield /> },
      { key: "desks", href: "/dashboard/editors", icon: <IconUsers /> },
      { key: "recycleBin", href: "/dashboard/recycle-bin", icon: <IconInbox /> },
      { key: "importExport", href: "/dashboard/import-export", icon: <IconDoc /> },
      { key: "audit", href: "/dashboard/audit", icon: <IconShield /> },
    );
  } else if (role === "reviewer") {
    adminItems.push({ key: "desks", href: "/dashboard/editors", icon: <IconUsers /> });
  }

  const roleText = roleLabel(role, lang);

  const navSections: { label?: string; items: NavItem[]; renderLabel?: string }[] = [];
  navSections.push({
    items: [{ key: "home", href: "/dashboard", icon: <IconHome /> }],
    renderLabel: t("home", lang),
  });
  if (centreItems.length > 0) {
    navSections.push({ label: t("centreContent", lang), items: centreItems });
  }
  if (researchItems.length > 0) {
    navSections.push({ label: t("research", lang), items: researchItems });
  }
  if (utility.length > 0) {
    navSections.push({ items: utility });
  }
  if (adminItems.length > 0) {
    navSections.push({ label: t("admin", lang), items: adminItems });
  }

  const query = navQuery.trim().toLowerCase();
  const searchResults = query
    ? navSections
        .flatMap((s) =>
          s.items
            .filter((i) => t(i.key, lang).toLowerCase().includes(query))
            .map((i) => ({ ...i, renderLabel: t(i.key, lang) })),
        )
        .slice(0, 12)
    : [];

  const navBody = query ? (
    <div className="cms-nav-search-in">
      {searchResults.length > 0 ? (
        <ul className="flex flex-col gap-0.5">
          {searchResults.map((item) => (
            <NavLink
              key={item.key}
              item={item}
              active={isActive(item.href)}
              label={item.renderLabel ?? t(item.key, lang)}
              onNavigate={() => {
                setMenuOpen(false);
                setNavQuery("");
              }}
            />
          ))}
        </ul>
      ) : (
        <p className="px-3 py-6 text-sm text-crs-muted">{t("navNoResults", lang)}</p>
      )}
    </div>
  ) : (
    <>
      <NavLink
        item={{ key: "home", href: "/dashboard", icon: <IconHome /> }}
        active={isActive("/dashboard")}
        label={t("home", lang)}
        onNavigate={() => setMenuOpen(false)}
      />

      {navSections
        .filter((s) => s.label)
        .map((s) => (
          <NavGroup key={s.label} label={s.label!}>
            {s.items.map((item) => (
              <NavLink
                key={item.key}
                item={item}
                active={isActive(item.href)}
                label={t(item.key, lang)}
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
          </NavGroup>
        ))}

      {navSections
        .filter((s) => !s.label && s.items.length > 0)
        .map((s) => (
          <div key={`utility-${s.items[0]!.key}`}>
            <div className="mx-3 my-3 border-t border-crs-border" />
            {s.items.map((item) => (
              <NavLink
                key={item.key}
                item={item}
                active={isActive(item.href)}
                label={t(item.key, lang)}
                onNavigate={() => setMenuOpen(false)}
              />
            ))}
          </div>
        ))}
    </>
  );

  return (
    <CmsLangProvider lang={lang}>
    <div dir={dir} lang={lang} className="min-h-full cms-desk-bg">
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
        <Link
          href="/dashboard"
          className="flex items-center gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-crs-primary/40"
          onClick={() => setMenuOpen(false)}
          aria-label={t("home", lang)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/crsic_logo.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
            aria-hidden
          />
          <span className="text-sm font-semibold text-crs-ink">CRSIC</span>
        </Link>
        <button
          type="button"
          onClick={toggleLang}
          className="ms-auto min-h-11 rounded-xl border border-crs-border px-3 text-xs text-crs-ink hover:bg-crs-bg"
          aria-label={t("langToggleAria", lang)}
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
            /* Off-canvas transforms are max-md only — rtl:translate-x-full must not
               override md:translate-x-0 or the desktop sidebar vanishes in Arabic. */
            menuOpen
              ? "translate-x-0"
              : "max-md:-translate-x-full max-md:rtl:translate-x-full"
          }`}
        >
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-3 border-b border-crs-border/70 bg-gradient-to-r from-crs-primary/5 via-transparent to-transparent px-4 py-5 outline-none transition-colors hover:bg-crs-bg/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crs-primary/40"
            onClick={() => setMenuOpen(false)}
            aria-label={t("home", lang)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/crsic_logo.png"
              alt=""
              width={64}
              height={64}
              className="h-16 w-16 shrink-0 object-contain"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-base font-semibold tracking-tight text-crs-ink">CRSIC</p>
              <p className="text-xs text-crs-muted">{t("contentCms", lang)}</p>
            </div>
          </Link>

          <div className="shrink-0 px-3 pb-1 pt-3">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-crs-muted" />
              <input
                type="search"
                value={navQuery}
                onChange={(e) => setNavQuery(e.target.value)}
                placeholder={t("navSearch", lang)}
                aria-label={t("navSearch", lang)}
                className="min-h-10 w-full rounded-xl border border-crs-border bg-crs-surface ps-9 pe-3 text-sm text-crs-ink placeholder:text-crs-muted focus-visible:border-crs-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crs-accent/25"
              />
            </div>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-2" aria-label={t("mainNav", lang)}>
            {navBody}
          </nav>

          <div className="shrink-0 border-t border-crs-border p-3">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-crs-primary/15 text-xs font-semibold text-crs-primary">
                {initials(displayName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-crs-ink">{displayName}</p>
                <p className="truncate text-[11px] text-crs-muted">{roleText}</p>
              </div>
            </div>
            <p className="sr-only">{email}</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={toggleLang}
                className="hidden min-h-10 flex-1 rounded-xl border border-crs-border text-xs text-crs-ink hover:bg-crs-bg md:inline-flex md:items-center md:justify-center"
                aria-label={t("langToggleAria", lang)}
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

        <div className="min-w-0 flex-1 cms-desk-bg">
          <div key={pathname} className="cms-page-enter">
            {children}
          </div>
        </div>
      </div>
    </div>
    </CmsLangProvider>
  );
}
