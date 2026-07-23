export type CmsLang = "en" | "ar";

export const CMS_LANG_COOKIE = "cms_lang";

export function normalizeLang(value: string | undefined | null): CmsLang {
  return value === "ar" ? "ar" : "en";
}

type LabelMap = Record<string, { en: string; ar: string }>;

/** Nav chrome + dashboard queue labels (AR RTL / EN LTR). */
export const LABELS: LabelMap = {
  home: { en: "Home", ar: "الرئيسية" },
  dashboard: { en: "Home", ar: "الرئيسية" },
  myContent: { en: "My content", ar: "محتواي" },
  centreContent: { en: "Centre content", ar: "محتوى المركز" },
  research: { en: "Research", ar: "البحث" },
  admin: { en: "Admin", ar: "الإدارة" },
  news: { en: "News", ar: "الأخبار" },
  events: { en: "Events", ar: "الفعاليات" },
  publications: { en: "Publications", ar: "المنشورات" },
  partners: { en: "Partners", ar: "الشركاء" },
  alerts: { en: "Alerts", ar: "التنبيهات" },
  researchGroups: { en: "Research groups", ar: "الفرق البحثية" },
  researchProjects: { en: "Research projects", ar: "المشاريع البحثية" },
  media: { en: "Media", ar: "الوسائط" },
  notifications: { en: "Notifications", ar: "الإشعارات" },
  profile: { en: "Profile", ar: "الملف الشخصي" },
  users: { en: "Users", ar: "المستخدمون" },
  orgUnits: { en: "Org scopes", ar: "نطاقات المؤسسة" },
  editors: { en: "Editors", ar: "المحررون" },
  audit: { en: "Audit", ar: "سجل التدقيق" },
  logout: { en: "Logout", ar: "تسجيل الخروج" },
  menuOpen: { en: "Menu", ar: "القائمة" },
  menuClose: { en: "Close", ar: "إغلاق" },

  // Home cockpit
  homeTitle: { en: "What to do next", ar: "ماذا تفعل الآن" },
  homeSubtitleEditor: {
    en: "Your drafts, revisions, and recent publishes.",
    ar: "مسوداتك والتعديلات والمنشورات الحديثة.",
  },
  homeSubtitleReviewer: {
    en: "Items waiting for your review, then your queues.",
    ar: "عناصر بانتظار مراجعتك، ثم قوائمك.",
  },
  homeSubtitleSa: {
    en: "Review inbox, governance queues, and overview.",
    ar: "صندوق المراجعة وقوائم الحوكمة والنظرة العامة.",
  },
  ctaReviewNext: { en: "Review next", ar: "راجع التالي" },
  ctaContinueDraft: { en: "Continue draft", ar: "تابع المسودة" },
  ctaFixRevision: { en: "Fix revision", ar: "أصلح التعديل" },
  ctaCreateNews: { en: "Create news", ar: "أنشئ خبرًا" },
  ctaBrowseContent: { en: "Browse my content", ar: "تصفح محتواي" },
  homeTip: {
    en: "Tip: start from Home. Content types are under Centre content or Research.",
    ar: "تلميح: ابدأ من الرئيسية. أنواع المحتوى تحت محتوى المركز أو البحث.",
  },
  dismissTip: { en: "Dismiss", ar: "إخفاء" },
  showTip: { en: "Show tip", ar: "أظهر التلميح" },
  ctaEnglishNext: { en: "Next EN item", ar: "العنصر الإنجليزي التالي" },
  moreInQueue: { en: "more — open an item above to continue.", ar: "المزيد — افتح عنصراً أعلاه للمتابعة." },
  backHome: { en: "← Home", ar: "→ الرئيسية" },
  backToList: { en: "← List", ar: "→ القائمة" },

  // Queues
  awaitingReview: { en: "Awaiting review", ar: "في انتظار المراجعة" },
  needsRevision: { en: "Needs revision", ar: "بحاجة إلى تعديل" },
  myDrafts: { en: "My drafts", ar: "مسوداتي" },
  rejected: { en: "Rejected", ar: "مرفوض" },
  unpublished: { en: "Unpublished", ar: "غير منشور" },
  recentlyPublished: { en: "Recently published", ar: "المنشور حديثًا" },
  englishPending: { en: "English pending", ar: "الإنجليزية معلّقة" },
  englishPendingEmpty: {
    en: "No published items waiting on English. AR-first publish is allowed.",
    ar: "لا توجد عناصر منشورة بانتظار الإنجليزية. يُسمح بالنشر بالعربية أولاً.",
  },
  noItems: { en: "Nothing here.", ar: "لا يوجد شيء هنا." },
  emptyAwaitingReview: {
    en: "Nothing waiting for review.",
    ar: "لا يوجد شيء بانتظار المراجعة.",
  },
  emptyMyDrafts: {
    en: "No drafts yet. Use Create news above, or open a type under Centre content / Research.",
    ar: "لا مسودات بعد. استخدم «إنشاء خبر» أعلاه، أو افتح نوعاً من محتوى المركز / البحث.",
  },
  emptyNeedsRevision: {
    en: "No items need changes right now.",
    ar: "لا عناصر تحتاج تعديلاً الآن.",
  },

  // Forms
  sectionIdentity: { en: "Identity", ar: "الهوية" },
  sectionBody: { en: "Body", ar: "النص" },
  sectionMedia: { en: "Media", ar: "الوسائط" },
  sectionAdvanced: { en: "English, SEO & more", ar: "الإنجليزية وتحسين الظهور والمزيد" },
  sectionAdvancedHint: {
    en: "Optional. Arabic is enough to submit; open this for EN or SEO.",
    ar: "اختياري. العربية كافية للإرسال؛ افتح هذا للإنجليزية أو تحسين الظهور.",
  },
  sectionChecklist: { en: "Submit checklist", ar: "قائمة التحقق قبل الإرسال" },
  sectionActions: { en: "Actions", ar: "الإجراءات" },
  savedStay: {
    en: "Saved. Stay here to continue, or return Home when ready.",
    ar: "تم الحفظ. ابقَ هنا للمتابعة، أو ارجع للرئيسية عند الانتهاء.",
  },
  submittedNext: {
    en: "Submitted — waiting for review. You can return Home.",
    ar: "تم الإرسال — بانتظار المراجعة. يمكنك العودة للرئيسية.",
  },
  approvedNext: {
    en: "Approved. Publish when ready, or return Home.",
    ar: "تمت الموافقة. انشر عند الجاهزية، أو ارجع للرئيسية.",
  },
  publishedNext: {
    en: "Published to the public site.",
    ar: "نُشر على الموقع العام.",
  },

  langToggle: { en: "العربية", ar: "English" },
  signedInAs: { en: "Signed in as", ar: "مسجّل الدخول باسم" },
};

export function t(key: keyof typeof LABELS | string, lang: CmsLang): string {
  const entry = LABELS[key];
  if (!entry) return key;
  return entry[lang];
}
