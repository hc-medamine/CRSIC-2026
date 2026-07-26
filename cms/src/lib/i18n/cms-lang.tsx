"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { CmsLang } from "@/lib/i18n/labels";

const CmsLangContext = createContext<CmsLang>("en");

export function CmsLangProvider({
  lang,
  children,
}: {
  lang: CmsLang;
  children: ReactNode;
}) {
  return <CmsLangContext.Provider value={lang}>{children}</CmsLangContext.Provider>;
}

/** Active CMS UI language (from chrome cookie / toggle). */
export function useCmsLang(): CmsLang {
  return useContext(CmsLangContext);
}
