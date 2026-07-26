export type CmsLang = "en" | "ar";

export const CMS_LANG_COOKIE = "cms_lang";

export function normalizeLang(value: string | undefined | null): CmsLang {
  return value === "ar" ? "ar" : "en";
}

type LabelMap = Record<string, { en: string; ar: string }>;

/**
 * CMS chrome + authoring copy (formal institutional tone).
 * Every key must have both en and ar. Prefer t(key, lang) — never hardcode "en".
 */
export const LABELS: LabelMap = {
  home: { en: "Home", ar: "الرئيسية" },
  dashboard: { en: "Home", ar: "الرئيسية" },
  myContent: { en: "My content", ar: "محتواي" },
  centreContent: { en: "Centre content", ar: "محتوى المركز" },
  research: { en: "Research", ar: "البحث" },
  admin: { en: "Administration", ar: "الإدارة" },
  news: { en: "News", ar: "الأخبار" },
  events: { en: "Events", ar: "الفعاليات" },
  publications: { en: "Publications", ar: "المنشورات" },
  partners: { en: "Partners", ar: "الشركاء" },
  alerts: { en: "Alerts", ar: "التنبيهات" },
  researchGroups: { en: "Research groups", ar: "الفرق البحثية" },
  researchProjects: { en: "Research projects", ar: "المشاريع البحثية" },
  media: { en: "Media library", ar: "مكتبة الوسائط" },
  notifications: { en: "Notifications", ar: "الإشعارات" },
  profile: { en: "Profile", ar: "الملف الشخصي" },
  users: { en: "Users", ar: "المستخدمون" },
  orgUnits: { en: "Organisation units", ar: "الوحدات التنظيمية" },
  editors: { en: "Editors", ar: "المحررون" },
  audit: { en: "Audit log", ar: "سجل التدقيق" },
  logout: { en: "Sign out", ar: "تسجيل الخروج" },
  menuOpen: { en: "Menu", ar: "القائمة" },
  menuClose: { en: "Close", ar: "إغلاق" },
  mainNav: { en: "Main navigation", ar: "القائمة الرئيسية" },
  langToggleAria: { en: "Switch language", ar: "تبديل اللغة" },
  contentCms: { en: "Content management", ar: "إدارة المحتوى" },

  // Home cockpit
  homeTitle: { en: "What to do next", ar: "ماذا تفعل الآن" },
  welcomeBack: { en: "Welcome back", ar: "مرحبًا بعودتك" },
  yourQueues: { en: "Your queues", ar: "قوائم المتابعة" },
  queuesSubtitle: {
    en: "An overview of content awaiting your attention.",
    ar: "نظرة عامة على المحتوى الذي يحتاج إلى عنايتكم.",
  },
  openNextReview: { en: "Open next review", ar: "افتح المراجعة التالية" },
  draftsNeedingWork: { en: "Drafts needing work", ar: "مسودات تحتاج إلى عمل" },
  draftsNeedingWorkHint: {
    en: "Continue editing before you submit.",
    ar: "واصلوا التحرير قبل الإرسال للمراجعة.",
  },
  reviewInbox: { en: "Review inbox", ar: "صندوق المراجعة" },
  reviewInboxHint: {
    en: "Submitted items waiting for a decision.",
    ar: "عناصر مُرسلة بانتظار قرار.",
  },
  recentlyPublishedHint: {
    en: "Latest items live on the public site.",
    ar: "أحدث العناصر المنشورة على الموقع العام.",
  },
  viewAllDrafts: { en: "View all drafts", ar: "عرض كل المسودات" },
  viewFullInbox: { en: "View full inbox", ar: "عرض صندوق المراجعة كاملًا" },
  viewAllPublished: { en: "View all published", ar: "عرض كل المنشور" },
  submittedBy: { en: "Submitted by", ar: "أرسله" },
  homeSubtitleEditor: {
    en: "Your drafts, revisions, and recent publishes.",
    ar: "مسوداتكم والتعديلات والمنشورات الحديثة.",
  },
  homeSubtitleReviewer: {
    en: "Items waiting for your review, then your queues.",
    ar: "عناصر بانتظار مراجعتكم، ثم قوائم المتابعة.",
  },
  homeSubtitleSa: {
    en: "Review inbox, governance queues, and overview.",
    ar: "صندوق المراجعة وقوائم الحوكمة والنظرة العامة.",
  },
  ctaReviewNext: { en: "Review next", ar: "راجع التالي" },
  ctaContinueDraft: { en: "Continue draft", ar: "تابع المسودة" },
  ctaFixRevision: { en: "Fix revision", ar: "أصلح التعديل" },
  ctaCreateNews: { en: "Create news", ar: "أنشئ خبرًا" },
  ctaCreate: { en: "Create", ar: "أنشئ" },
  ctaCreateContent: { en: "Create content", ar: "أنشئ محتوى" },
  ctaBrowseContent: { en: "Browse my content", ar: "تصفح محتواي" },
  homeTip: {
    en: "Tip: start from Home. Content types are under Centre content or Research.",
    ar: "تلميح: ابدأوا من الرئيسية. أنواع المحتوى تحت «محتوى المركز» أو «البحث».",
  },
  dismissTip: { en: "Dismiss", ar: "إخفاء" },
  showTip: { en: "Show tip", ar: "أظهر التلميح" },
  ctaEnglishNext: { en: "Next English item", ar: "العنصر الإنجليزي التالي" },
  moreInQueue: {
    en: "more — open an item above to continue.",
    ar: "المزيد — افتحوا عنصرًا أعلاه للمتابعة.",
  },
  backHome: { en: "Home", ar: "الرئيسية" },
  backToList: { en: "Back to list", ar: "العودة إلى القائمة" },
  editReview: { en: "Edit / review", ar: "تحرير / مراجعة" },
  edit: { en: "Edit", ar: "تحرير" },
  create: { en: "Create", ar: "إنشاء" },

  // Queues & statuses
  awaitingReview: { en: "Awaiting review", ar: "في انتظار المراجعة" },
  needsRevision: { en: "Needs revision", ar: "بحاجة إلى تعديل" },
  myDrafts: { en: "My drafts", ar: "مسوداتي" },
  rejected: { en: "Rejected", ar: "مرفوض" },
  unpublished: { en: "Unpublished", ar: "غير منشور" },
  recentlyPublished: { en: "Recently published", ar: "المنشور حديثًا" },
  englishPending: { en: "English pending", ar: "الترجمة الإنجليزية معلّقة" },
  englishPendingEmpty: {
    en: "No published items waiting on English. Arabic-first publish is allowed.",
    ar: "لا توجد عناصر منشورة بانتظار الإنجليزية. يُسمح بالنشر بالعربية أولًا.",
  },
  noItems: { en: "Nothing here.", ar: "لا يوجد شيء هنا." },
  emptyAwaitingReview: {
    en: "Nothing waiting for review.",
    ar: "لا يوجد شيء بانتظار المراجعة.",
  },
  emptyMyDrafts: {
    en: "No drafts yet. Create an item from Centre content or Research.",
    ar: "لا مسودات بعد. أنشئوا عنصرًا من محتوى المركز أو البحث.",
  },
  emptyNeedsRevision: {
    en: "No items need changes right now.",
    ar: "لا عناصر تحتاج تعديلًا الآن.",
  },
  statusDraft: { en: "Draft", ar: "مسودة" },
  statusSubmitted: { en: "Submitted", ar: "مُرسل للمراجعة" },
  statusChangesRequested: { en: "Changes requested", ar: "طُلبت تعديلات" },
  statusApproved: { en: "Approved", ar: "موافق عليه" },
  statusPublished: { en: "Published", ar: "منشور" },
  statusUnpublished: { en: "Unpublished", ar: "غير منشور" },
  statusRejected: { en: "Rejected", ar: "مرفوض" },
  statusLabel: { en: "Status", ar: "الحالة" },
  enPending: { en: "English pending", ar: "الإنجليزية معلّقة" },
  enReady: { en: "English ready", ar: "الإنجليزية جاهزة" },
  enStatus: { en: "English status", ar: "حالة الإنجليزية" },
  enStatusPending: { en: "Pending", ar: "معلّق" },
  enStatusReady: { en: "Ready", ar: "جاهز" },

  // Roles
  roleSuperAdmin: { en: "Super administrator", ar: "المشرف الأعلى" },
  roleReviewer: { en: "Reviewer", ar: "المراجع" },
  roleEditor: { en: "Editor", ar: "المحرر" },
  rolePublisher: { en: "Publisher", ar: "الناشر" },
  roleReviewOwner: { en: "Review owner", ar: "مسؤول المراجعة" },
  labelEditor: { en: "Editor", ar: "المحرر" },
  labelReviewer: { en: "Reviewer", ar: "المراجع" },
  labelPublisher: { en: "Publisher", ar: "الناشر" },
  labelReviewOwner: { en: "Review owner", ar: "مسؤول المراجعة" },
  escalated: { en: "Escalated", ar: "مُصعَّد" },
  emergencyNeedsPostReview: {
    en: "Emergency publish — post-review required",
    ar: "نشر طارئ — يلزم مراجعة لاحقة",
  },

  // Forms — sections
  sectionIdentity: { en: "Identity", ar: "الهوية" },
  sectionBody: { en: "Body", ar: "النص" },
  sectionMedia: { en: "Media", ar: "الوسائط" },
  sectionAdvanced: {
    en: "English, SEO & more",
    ar: "الإنجليزية وتحسين الظهور والمزيد",
  },
  sectionAdvancedHint: {
    en: "Optional. Arabic is enough to submit; open this for English or SEO.",
    ar: "اختياري. العربية كافية للإرسال؛ افتحوا هذا للإنجليزية أو تحسين الظهور.",
  },
  sectionChecklist: { en: "Submit checklist", ar: "قائمة التحقق قبل الإرسال" },
  sectionActions: { en: "Actions", ar: "الإجراءات" },
  savedStay: {
    en: "Saved. You may continue here, or return Home when ready.",
    ar: "تم الحفظ. يمكنكم المتابعة هنا، أو العودة للرئيسية عند الانتهاء.",
  },
  submittedNext: {
    en: "Submitted — awaiting review. You may return Home.",
    ar: "تم الإرسال — بانتظار المراجعة. يمكنكم العودة للرئيسية.",
  },
  approvedNext: {
    en: "Approved. Publish when ready, or return Home.",
    ar: "تمت الموافقة. انشروا عند الجاهزية، أو ارجعوا للرئيسية.",
  },
  publishedNext: {
    en: "Published to the public site.",
    ar: "نُشر على الموقع العام.",
  },
  savedShort: { en: "Saved.", ar: "تم الحفظ." },
  deletedShort: { en: "Deleted.", ar: "تم الحذف." },
  actionFailed: {
    en: "The action could not be completed. Please try again.",
    ar: "تعذّر إتمام الإجراء. يرجى المحاولة مرة أخرى.",
  },
  createFailed: {
    en: "Could not create the draft. Please try again.",
    ar: "تعذّر إنشاء المسودة. يرجى المحاولة مرة أخرى.",
  },

  // Workflow actions
  actionSaving: { en: "Saving…", ar: "جارٍ الحفظ…" },
  actionCreateDraft: { en: "Create draft", ar: "إنشاء مسودة" },
  actionSaveDraft: { en: "Save draft", ar: "حفظ المسودة" },
  actionChecklistOk: { en: "Checklist confirmed", ar: "تم تأكيد قائمة التحقق" },
  actionSubmit: { en: "Submit for review", ar: "إرسال للمراجعة" },
  actionWithdraw: { en: "Withdraw submission", ar: "سحب الإرسال" },
  actionReviewerActions: { en: "Reviewer actions", ar: "إجراءات المراجع" },
  actionApprove: { en: "Approve", ar: "موافقة" },
  actionRequestChanges: { en: "Request changes", ar: "طلب تعديلات" },
  actionReject: { en: "Reject", ar: "رفض" },
  actionNotePlaceholder: {
    en: "Note for the editor (changes or rejection)",
    ar: "ملاحظة للمحرر (للتعديلات أو الرفض)",
  },
  actionPublish: { en: "Publish to the public site", ar: "نشر على الموقع" },
  actionStartRevision: {
    en: "Create revision (public version stays live)",
    ar: "إنشاء تعديل (تبقى النسخة العامة منشورة)",
  },
  actionUnpublish: { en: "Unpublish", ar: "إلغاء النشر" },
  actionReopenDraft: { en: "Reopen as draft", ar: "إعادة فتح كمسودة" },
  actionDelete: { en: "Delete permanently", ar: "حذف نهائي" },
  confirmDelete: {
    en: "Permanently delete this item? This cannot be undone.",
    ar: "حذف هذا العنصر نهائيًا؟ لا يمكن التراجع عن هذا الإجراء.",
  },
  fourEyesNotice: {
    en: "You cannot review or publish content you authored. Please use a different reviewer account.",
    ar: "لا يمكن مراجعة محتوى ألّفته بنفسك. يُرجى استخدام حساب مراجع آخر.",
  },

  // Common field labels
  fieldOrgUnit: { en: "Organisation unit", ar: "الوحدة التنظيمية" },
  fieldTitleAr: { en: "Title (Arabic) *", ar: "العنوان (عربي) *" },
  fieldTitleEn: { en: "Title (English)", ar: "العنوان (إنجليزي)" },
  fieldLabelAr: { en: "Label (Arabic)", ar: "التسمية (عربية)" },
  fieldLabelEn: { en: "Label (English)", ar: "التسمية (إنجليزية)" },
  fieldSummaryAr: { en: "Summary (Arabic)", ar: "الملخص (عربي)" },
  fieldSummaryEn: { en: "Summary (English)", ar: "الملخص (إنجليزي)" },
  fieldBodyAr: { en: "Body (Arabic)", ar: "النص (عربي)" },
  fieldBodyEn: { en: "Body (English)", ar: "النص (إنجليزي)" },
  fieldDibajaAr: {
    en: "Dibaja / introduction (Arabic)",
    ar: "الديباجة / المقدّمة (عربية)",
  },
  fieldDibajaEn: {
    en: "Dibaja / introduction (English)",
    ar: "الديباجة / المقدّمة (إنجليزية)",
  },
  fieldImageAltAr: { en: "Image alt text (Arabic)", ar: "النص البديل للصورة (عربي)" },
  fieldImageAltEn: { en: "Image alt text (English)", ar: "النص البديل للصورة (إنجليزي)" },
  fieldPublicSlug: {
    en: "Public slug (optional override)",
    ar: "المعرّف العام (تجاوز اختياري)",
  },
  fieldPublicSlugPh: {
    en: "Generated from the Arabic title on publish if left blank",
    ar: "يُولَّد من العنوان العربي عند النشر إن تُرك فارغًا",
  },
  fieldScopeNational: { en: "National", ar: "وطني" },
  fieldScopeInternational: { en: "International", ar: "دولي" },

  // Lists
  colTitle: { en: "Title", ar: "العنوان" },
  colStatus: { en: "Status", ar: "الحالة" },
  colEn: { en: "EN", ar: "EN" },
  colUpdated: { en: "Updated", ar: "آخر تحديث" },
  untitled: { en: "(untitled)", ar: "(بدون عنوان)" },
  showingResults: { en: "Showing {n} result(s)", ar: "عرض {n} نتيجة" },
  filterAllStatus: { en: "All statuses", ar: "كل الحالات" },
  filterSearch: { en: "Search…", ar: "بحث…" },
  filterApply: { en: "Filter", ar: "تصفية" },
  newArticle: { en: "New article", ar: "مقال جديد" },
  newPartner: { en: "New partner", ar: "شريك جديد" },
  newAlert: { en: "New alert", ar: "تنبيه جديد" },
  newResearchGroup: { en: "New research group", ar: "فريق بحثي جديد" },
  newResearchProject: { en: "New research project", ar: "مشروع بحثي جديد" },
  newEvent: { en: "New event", ar: "فعالية جديدة" },
  newPublication: { en: "New publication", ar: "منشور جديد" },
  emptyNews: { en: "No news items yet.", ar: "لا أخبار بعد." },
  emptyEvents: { en: "No events yet.", ar: "لا فعاليات بعد." },
  emptyPublications: { en: "No publications yet.", ar: "لا منشورات بعد." },
  emptyPartners: { en: "No partners yet.", ar: "لا شركاء بعد." },
  emptyAlerts: { en: "No alerts yet.", ar: "لا تنبيهات بعد." },
  emptyResearchGroups: { en: "No research groups yet.", ar: "لا فرق بحثية بعد." },
  emptyResearchProjects: { en: "No research projects yet.", ar: "لا مشاريع بحثية بعد." },
  workflowHintNews: {
    en: "Draft → submit → review → publish",
    ar: "مسودة ← إرسال ← مراجعة ← نشر",
  },
  workflowHintGeneric: {
    en: "Draft → review → publish",
    ar: "مسودة ← مراجعة ← نشر",
  },
  alertsExclusivity: {
    en: "At most one alert is live on the public site at a time.",
    ar: "يُعرض تنبيه واحد فقط على الموقع العام في الوقت نفسه.",
  },

  // Relative time
  relativeMinutes: { en: "{n}m", ar: "{n} د" },
  relativeHours: { en: "{n}h", ar: "{n} س" },
  relativeDays: { en: "{n}d", ar: "{n} ي" },

  langToggle: { en: "العربية", ar: "English" },
  signedInAs: { en: "Signed in as", ar: "مسجّل الدخول باسم" },
  dismiss: { en: "Dismiss", ar: "إغلاق" },
  breadcrumb: { en: "Breadcrumb", ar: "مسار التنقل" },
};

const STATUS_KEYS: Record<string, string> = {
  draft: "statusDraft",
  submitted: "statusSubmitted",
  changes_requested: "statusChangesRequested",
  approved: "statusApproved",
  published: "statusPublished",
  unpublished: "statusUnpublished",
  rejected: "statusRejected",
};

const ROLE_KEYS: Record<string, string> = {
  super_admin: "roleSuperAdmin",
  reviewer: "roleReviewer",
  editor: "roleEditor",
};

export function t(key: keyof typeof LABELS | string, lang: CmsLang): string {
  const entry = LABELS[key];
  if (!entry) return key;
  return entry[lang];
}

/** Human label for workflow status enums. */
export function statusLabel(status: string, lang: CmsLang): string {
  const key = STATUS_KEYS[status.toLowerCase()];
  return key ? t(key, lang) : status.replace(/_/g, " ");
}

/** Human label for user roles. */
export function roleLabel(role: string, lang: CmsLang): string {
  const key = ROLE_KEYS[role.toLowerCase()];
  return key ? t(key, lang) : role.replace(/_/g, " ");
}

/** Interpolate `{n}` (and similar) placeholders. */
export function tf(
  key: keyof typeof LABELS | string,
  lang: CmsLang,
  vars: Record<string, string | number>,
): string {
  let out = t(key, lang);
  for (const [k, v] of Object.entries(vars)) {
    out = out.replaceAll(`{${k}}`, String(v));
  }
  return out;
}
