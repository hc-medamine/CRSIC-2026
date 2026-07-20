export type CmsLang = "en" | "ar";

export const CMS_LANG_COOKIE = "cms_lang";

export function normalizeLang(value: string | undefined | null): CmsLang {
  return value === "ar" ? "ar" : "en";
}

type LabelMap = Record<string, { en: string; ar: string }>;

/** Nav chrome + dashboard queue labels (AR RTL / EN LTR). */
export const LABELS: LabelMap = {
  dashboard: { en: "Dashboard", ar: "لوحة التحكم" },
  news: { en: "News", ar: "الأخبار" },
  events: { en: "Events", ar: "الفعاليات" },
  publications: { en: "Publications", ar: "المنشورات" },
  media: { en: "Media", ar: "الوسائط" },
  notifications: { en: "Notifications", ar: "الإشعارات" },
  profile: { en: "Profile", ar: "الملف الشخصي" },
  users: { en: "Users", ar: "المستخدمون" },
  audit: { en: "Audit", ar: "سجل التدقيق" },
  logout: { en: "Logout", ar: "تسجيل الخروج" },

  // Queues
  awaitingReview: { en: "Awaiting review", ar: "في انتظار المراجعة" },
  needsRevision: { en: "Needs revision", ar: "بحاجة إلى تعديل" },
  myDrafts: { en: "My drafts", ar: "مسوداتي" },
  rejected: { en: "Rejected", ar: "مرفوض" },
  unpublished: { en: "Unpublished", ar: "غير منشور" },
  recentlyPublished: { en: "Recently published", ar: "المنشور حديثًا" },
  noItems: { en: "Nothing here.", ar: "لا يوجد شيء هنا." },

  langToggle: { en: "العربية", ar: "English" },
  signedInAs: { en: "Signed in as", ar: "مسجّل الدخول باسم" },
};

export function t(key: keyof typeof LABELS | string, lang: CmsLang): string {
  const entry = LABELS[key];
  if (!entry) return key;
  return entry[lang];
}
