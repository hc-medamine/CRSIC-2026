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
  featuredNews: { en: "Home featured news", ar: "أخبار الصفحة الرئيسية المميزة" },
  events: { en: "Events", ar: "الفعاليات" },
  publications: { en: "Publications", ar: "المنشورات" },
  partners: { en: "Partners", ar: "الشراكات" },
  laws: { en: "Laws & decrees", ar: "القوانين والمراسيم" },
  platforms: { en: "Platforms", ar: "المنصات" },
  alerts: { en: "Alerts", ar: "التنبيهات" },
  researchGroups: { en: "Research groups", ar: "الفرق البحثية" },
  researchProjects: { en: "Research projects", ar: "المشاريع البحثية" },
  media: { en: "Media library", ar: "مكتبة الوسائط" },
  mediaLibraryHint: {
    en: "Images and PDFs in your content folders. Editors see their own uploads; replacing a published file updates the public site immediately.",
    ar: "الصور وملفات PDF في مجلدات نطاقكم. يرى المحررون مرفوعاتهم فقط؛ استبدال ملف منشور يحدّث الموقع فورًا.",
  },
  mediaBucketAll: { en: "All media", ar: "كل الوسائط" },
  mediaBucketNews: { en: "News", ar: "الأخبار" },
  mediaBucketEvents: { en: "Events", ar: "الفعاليات" },
  mediaBucketCovers: { en: "Covers", ar: "الأغلفة" },
  mediaBucketPartners: { en: "Partners", ar: "الشراكات" },
  mediaBucketResearch: { en: "Research", ar: "البحث" },
  mediaBucketAlerts: { en: "Alerts", ar: "التنبيهات" },
  mediaBucketLaws: { en: "Laws", ar: "القوانين" },
  mediaBucketPlatforms: { en: "Platforms", ar: "المنصات" },
  mediaBucketSite: { en: "Site", ar: "الموقع" },
  directorWord: { en: "Director word", ar: "كلمة المدير" },
  directorWordTitle: { en: "Edit director greeting", ar: "تحرير كلمة المدير" },
  directorSectionQuote: { en: "Quote", ar: "الاقتباس" },
  directorSectionIdentity: { en: "Name & role", ar: "الاسم والصفة" },
  directorSectionPortrait: { en: "Portrait", ar: "الصورة" },
  directorQuoteAr: { en: "Quote (Arabic)", ar: "الاقتباس (عربي)" },
  directorQuoteEn: { en: "Quote (English)", ar: "الاقتباس (إنجليزي)" },
  directorNameAr: { en: "Name (Arabic)", ar: "الاسم (عربي)" },
  directorNameEn: { en: "Name (English)", ar: "الاسم (إنجليزي)" },
  directorRoleAr: { en: "Role (Arabic)", ar: "الصفة (عربي)" },
  directorRoleEn: { en: "Role (English)", ar: "الصفة (إنجليزي)" },
  directorPortrait: { en: "Portrait image", ar: "صورة المدير" },
  directorPortraitAltAr: { en: "Portrait alt (Arabic)", ar: "وصف الصورة (عربي)" },
  directorPortraitAltEn: { en: "Portrait alt (English)", ar: "وصف الصورة (إنجليزي)" },
  directorSaved: { en: "Director word saved", ar: "تم حفظ كلمة المدير" },
  directorPublished: { en: "Director word published", ar: "تم نشر كلمة المدير" },
  directorLastPublished: { en: "Last published", ar: "آخر نشر" },
  directorNeverPublished: {
    en: "Not published yet — About will keep locale/placeholder until you publish.",
    ar: "لم يُنشر بعد — ستبقى صفحة من نحن على النص الاحتياطي حتى تنشروا.",
  },
  directorMissingRow: {
    en: "Director record missing. Run database migrations.",
    ar: "سجل المدير غير موجود. نفّذوا ترحيلات قاعدة البيانات.",
  },
  featuredNewsTitle: { en: "Home featured playlist", ar: "قائمة الأخبار المميزة" },
  featuredNewsPlaylist: { en: "Playlist", ar: "القائمة" },
  featuredNewsHelp: {
    en: "Choose up to 10 published news items for the Home featured carousel. Order here is the public order.",
    ar: "اختاروا حتى 10 أخبار منشورة لشريط الصفحة الرئيسية. الترتيب هنا هو ترتيب العرض.",
  },
  featuredNewsCount: { en: "{n} of {max} items", ar: "{n} من {max} عناصر" },
  featuredNewsEmpty: {
    en: "No items yet. Add published news below, or publish an empty list to use the newest-three fallback.",
    ar: "لا عناصر بعد. أضيفوا أخبارًا منشورة أدناه، أو انشروا قائمة فارغة لاستخدام أحدث ثلاثة أخبار.",
  },
  featuredNewsAdd: { en: "Add published news", ar: "إضافة خبر منشور" },
  featuredNewsAddBtn: { en: "Add", ar: "إضافة" },
  featuredNewsPickOne: { en: "Select a news item…", ar: "اختاروا خبرًا…" },
  featuredNewsUp: { en: "Up", ar: "أعلى" },
  featuredNewsDown: { en: "Down", ar: "أسفل" },
  featuredNewsRemove: { en: "Remove", ar: "إزالة" },
  featuredNewsMax: {
    en: "The playlist already has 10 items. Remove one before adding another.",
    ar: "القائمة تحتوي على 10 عناصر. أزيلوا عنصرًا قبل إضافة آخر.",
  },
  featuredNewsFallbackBanner: {
    en: "Home is currently showing the three newest news items (no live playlist).",
    ar: "الصفحة الرئيسية تعرض حاليًا أحدث ثلاثة أخبار (لا قائمة منشورة).",
  },
  featuredNewsNeedsReview: {
    en: "A Reviewer or Super Admin must publish this playlist to the public site.",
    ar: "يجب أن ينشر المراجع أو المشرف الأعلى هذه القائمة على الموقع.",
  },
  featuredNewsSaved: { en: "Featured playlist saved", ar: "حُفظت قائمة الأخبار المميزة" },
  featuredNewsPublished: {
    en: "Featured playlist published",
    ar: "نُشرت قائمة الأخبار المميزة",
  },
  featuredNewsSaveFailed: { en: "Could not save the playlist", ar: "تعذّر حفظ القائمة" },
  featuredNewsPublishFailed: { en: "Could not publish the playlist", ar: "تعذّر نشر القائمة" },
  featuredNewsLastPublished: { en: "Last published", ar: "آخر نشر" },
  featuredNewsNeverPublished: {
    en: "Never published — Home uses the newest-three fallback.",
    ar: "لم تُنشر بعد — الصفحة الرئيسية تستخدم أحدث ثلاثة أخبار.",
  },
  featuredNewsMissingRow: {
    en: "Featured news record missing. Run database migrations.",
    ar: "سجل الأخبار المميزة غير موجود. شغّلوا ترحيل قاعدة البيانات.",
  },
  mediaUploadTo: { en: "Upload to folder", ar: "الرفع إلى المجلد" },
  mediaSelectFolderToUpload: {
    en: "Choose a folder below to upload new files.",
    ar: "اختاروا مجلدًا أدناه لرفع ملفات جديدة.",
  },
  mediaUnused: { en: "Not linked to an item yet", ar: "غير مرتبط بعنصر بعد" },
  mediaUpdated: { en: "Updated", ar: "آخر تحديث" },
  mediaBy: { en: "By", ar: "بواسطة" },
  mediaAlsoUsed: { en: "Also used in {n} other item(s)", ar: "مستخدم أيضًا في {n} عنصر آخر" },
  mediaSelectReplace: {
    en: "Select to replace (same URL)",
    ar: "اختيار للاستبدال (نفس الرابط)",
  },
  mediaOnPublicSite: { en: "On the public site", ar: "على الموقع العام" },
  mediaLiveReplaceHint: {
    en: "This file is on a published page. Replacing it updates the public site immediately (same URL).",
    ar: "هذا الملف ظاهر في صفحة منشورة. استبداله يحدّث الموقع فورًا (نفس الرابط).",
  },
  mediaReplaceTitle: { en: "Replace a published file?", ar: "استبدال ملف منشور؟" },
  mediaReplaceConfirm: { en: "Replace anyway", ar: "استبدال على أي حال" },
  mediaDelete: { en: "Delete", ar: "حذف" },
  mediaDeleteTitle: { en: "Delete this media?", ar: "حذف هذه الوسائط؟" },
  mediaDeleteLinked: {
    en: "Linked item: {title}",
    ar: "العنصر المرتبط: {title}",
  },
  mediaCannotUndo: { en: "This cannot be undone.", ar: "لا يمكن التراجع عن هذا الإجراء." },
  mediaCancel: { en: "Cancel", ar: "إلغاء" },
  mediaDeleting: { en: "Deleting…", ar: "جارٍ الحذف…" },
  mediaBlockedTitle: {
    en: "Cannot delete — still in use",
    ar: "تعذّر الحذف — ما زالت مستخدمة",
  },
  mediaClose: { en: "Close", ar: "إغلاق" },
  mediaEmpty: { en: "No uploads yet.", ar: "لا مرفوعات بعد." },
  mediaNoBuckets: {
    en: "No media folders in your content scopes.",
    ar: "لا مجلدات وسائط ضمن نطاقاتكم.",
  },
  mediaPreview: { en: "Preview image", ar: "معاينة الصورة" },
  mediaDeleteFailed: { en: "Delete failed", ar: "فشل الحذف" },
  typeNews: { en: "News", ar: "الأخبار" },
  typeEvent: { en: "Events", ar: "الفعاليات" },
  typePublication: { en: "Publications", ar: "المنشورات" },
  typePartner: { en: "Partners", ar: "الشراكات" },
  typeLaw: { en: "Laws & decrees", ar: "القوانين والمراسيم" },
  typePlatform: { en: "Platforms", ar: "المنصات" },
  typeAlert: { en: "Alerts", ar: "التنبيهات" },
  typeResearchGroup: { en: "Research groups", ar: "الفرق البحثية" },
  typeResearchProject: { en: "Research projects", ar: "المشاريع البحثية" },
  sourcePrimaryImage: { en: "Primary image", ar: "الصورة الأساسية" },
  sourceAttachments: { en: "Attachments", ar: "المرفقات" },
  sourceOgImage: { en: "Share image", ar: "صورة المشاركة" },
  sourceLiveCopy: { en: "Live public copy", ar: "النسخة العامة المنشورة" },
  sourceRevision: { en: "Revision", ar: "مراجعة" },
  sourceRevisionN: { en: "Revision #{n}", ar: "مراجعة #{n}" },
  notifications: { en: "Notifications", ar: "الإشعارات" },
  notificationsHint: {
    en: "In-app alerts only — no email is sent. Workflow actions create notifications here.",
    ar: "تنبيهات داخل النظام فقط — لا يُرسل بريد إلكتروني. تُنشأ الإشعارات هنا عند إجراءات سير العمل.",
  },
  notifUnreadLabel: { en: "Unread", ar: "غير مقروء" },
  notifMarkAllRead: { en: "Mark all read", ar: "تمييز الكل كمقروء" },
  notifMarkRead: { en: "Mark read", ar: "تعيين كمقروء" },
  notifOpen: { en: "Open", ar: "فتح" },
  notifEmpty: {
    en: "No notifications yet. Submitting, reviewing, and publishing content will appear here.",
    ar: "لا إشعارات بعد. سيظهر هنا ما ينتج عن إرسال المحتوى ومراجعته ونشره.",
  },
  notifUpdateFailed: {
    en: "Could not update notification.",
    ar: "تعذّر تحديث الإشعار.",
  },
  notifMarkedRead: { en: "Marked as read.", ar: "تم التعيين كمقروء." },
  notifAllMarkedRead: { en: "All marked as read.", ar: "تم تمييز الكل كمقروء." },
  notifActionChanges: { en: "Changes requested", ar: "طُلبت تعديلات" },
  notifActionApproved: { en: "Approved", ar: "موافقة" },
  notifActionRejected: { en: "Rejected", ar: "رفض" },
  notifActionPublished: { en: "Published", ar: "نُشر" },
  notifActionUnpublished: { en: "Unpublished", ar: "أُلغي النشر" },
  notifActionComment: { en: "Comment", ar: "تعليق" },
  notifActionReassigned: { en: "Reassigned", ar: "أُعيد التعيين" },
  notifActionEscalated: { en: "Escalated", ar: "صُعِّد" },
  notifActionAway: { en: "Away", ar: "غياب" },
  notifActionReviewOwner: { en: "Review owner", ar: "مسؤول المراجعة" },
  notifActionEmergency: { en: "Emergency", ar: "طارئ" },
  notifTitleChangesNews: { en: "Changes requested on news", ar: "طُلبت تعديلات على خبر" },
  notifTitleNewsApproved: { en: "News approved", ar: "تمت الموافقة على الخبر" },
  notifTitleNewsRejected: { en: "News rejected", ar: "رُفض الخبر" },
  notifTitleNewsPublished: { en: "News published", ar: "نُشر الخبر" },
  notifTitleNewsUnpublished: { en: "News unpublished", ar: "أُلغي نشر الخبر" },
  notifTitleChangesEvent: { en: "Changes requested on event", ar: "طُلبت تعديلات على فعالية" },
  notifTitleEventApproved: { en: "Event approved", ar: "تمت الموافقة على الفعالية" },
  notifTitleEventRejected: { en: "Event rejected", ar: "رُفضت الفعالية" },
  notifTitleEventPublished: { en: "Event published", ar: "نُشرت الفعالية" },
  notifTitleEventUnpublished: { en: "Event unpublished", ar: "أُلغي نشر الفعالية" },
  notifTitleChangesPub: {
    en: "Changes requested on publication",
    ar: "طُلبت تعديلات على منشور",
  },
  notifTitlePubApproved: { en: "Publication approved", ar: "تمت الموافقة على المنشور" },
  notifTitlePubRejected: { en: "Publication rejected", ar: "رُفض المنشور" },
  notifTitlePubPublished: { en: "Publication published", ar: "نُشر المنشور" },
  notifTitlePubUnpublished: { en: "Publication unpublished", ar: "أُلغي نشر المنشور" },
  notifTitleChangesPartner: {
    en: "Changes requested on partner",
    ar: "طُلبت تعديلات على شريك",
  },
  notifTitlePartnerApproved: { en: "Partner approved", ar: "تمت الموافقة على الشريك" },
  notifTitlePartnerRejected: { en: "Partner rejected", ar: "رُفض الشريك" },
  notifTitlePartnerPublished: { en: "Partner published", ar: "نُشر الشريك" },
  notifTitlePartnerUnpublished: { en: "Partner unpublished", ar: "أُلغي نشر الشريك" },
  notifTitleChangesAlert: { en: "Changes requested on alert", ar: "طُلبت تعديلات على تنبيه" },
  notifTitleAlertApproved: { en: "Alert approved", ar: "تمت الموافقة على التنبيه" },
  notifTitleAlertRejected: { en: "Alert rejected", ar: "رُفض التنبيه" },
  notifTitleAlertPublished: { en: "Alert published", ar: "نُشر التنبيه" },
  notifTitleAlertUnpublished: { en: "Alert unpublished", ar: "أُلغي نشر التنبيه" },
  notifTitleChangesGroup: {
    en: "Changes requested on research group",
    ar: "طُلبت تعديلات على فريق بحثي",
  },
  notifTitleGroupApproved: { en: "Research group approved", ar: "تمت الموافقة على الفريق البحثي" },
  notifTitleGroupRejected: { en: "Research group rejected", ar: "رُفض الفريق البحثي" },
  notifTitleGroupPublished: { en: "Research group published", ar: "نُشر الفريق البحثي" },
  notifTitleGroupUnpublished: {
    en: "Research group unpublished",
    ar: "أُلغي نشر الفريق البحثي",
  },
  notifTitleChangesProject: {
    en: "Changes requested on research project",
    ar: "طُلبت تعديلات على مشروع بحثي",
  },
  notifTitleProjectApproved: {
    en: "Research project approved",
    ar: "تمت الموافقة على المشروع البحثي",
  },
  notifTitleProjectRejected: {
    en: "Research project rejected",
    ar: "رُفض المشروع البحثي",
  },
  notifTitleProjectPublished: {
    en: "Research project published",
    ar: "نُشر المشروع البحثي",
  },
  notifTitleProjectUnpublished: {
    en: "Research project unpublished",
    ar: "أُلغي نشر المشروع البحثي",
  },
  notifTitleNewComment: { en: "New comment on content", ar: "تعليق جديد على محتوى" },
  notifTitleNewCommentYours: {
    en: "New comment on your content",
    ar: "تعليق جديد على محتواكم",
  },
  notifTitleAssigned: { en: "Item assigned to you", ar: "أُسند إليكم عنصر" },
  notifTitleReviewOwnerProposal: {
    en: "Review owner proposal needs confirmation",
    ar: "اقتراح مسؤول المراجعة بانتظار التأكيد",
  },
  notifTitleYouAreReviewOwner: {
    en: "You are the review owner",
    ar: "أنتم مسؤول المراجعة",
  },
  notifTitleEscalated: { en: "Content escalated", ar: "صُعِّد المحتوى" },
  notifTitleAway: { en: "Reviewer Away (OOO)", ar: "المراجع غائب (خارج المكتب)" },
  notifTitleEmergencyPublish: {
    en: "Emergency publish — post-review required",
    ar: "نشر طارئ — يلزم مراجعة لاحقة",
  },
  notifTitlePostReviewConfirmed: {
    en: "Post-publication review confirmed",
    ar: "أُكّدت المراجعة بعد النشر",
  },
  notifTitlePostReviewChanges: {
    en: "Post-review: changes requested",
    ar: "مراجعة لاحقة: طُلبت تعديلات",
  },
  notifTitleEmergencyUnpublished: {
    en: "Emergency item unpublished",
    ar: "أُلغي نشر عنصر طارئ",
  },
  profile: { en: "Profile", ar: "الملف الشخصي" },
  profileHint: {
    en: "You can edit your name. Role and access are managed by a Super administrator only.",
    ar: "يمكنكم تعديل الاسم. الدور والصلاحيات يديرهما المشرف الأعلى فقط.",
  },
  profileEmailReadonly: {
    en: "Email (login — read only)",
    ar: "البريد الإلكتروني (تسجيل الدخول — للقراءة فقط)",
  },
  profileRoleReadonly: { en: "Role (read only)", ar: "الدور (للقراءة فقط)" },
  profileDisplayName: { en: "Display name", ar: "الاسم المعروض" },
  profileNameAr: { en: "Name (AR)", ar: "الاسم (عربي)" },
  profileNameEn: { en: "Name (EN)", ar: "الاسم (إنجليزي)" },
  profileSave: { en: "Save profile", ar: "حفظ الملف الشخصي" },
  profileSaved: { en: "Profile saved.", ar: "تم حفظ الملف الشخصي." },
  updateFailed: { en: "Update failed", ar: "فشل التحديث" },
  awayTitle: { en: "Out of office (Away)", ar: "خارج المكتب (غياب)" },
  awayHint: {
    en: "While Away, your review actions are frozen. Pick one Editor to elevate to temporary Reviewer. All Editors are notified. Role reverts when you clear Away or the until-date passes.",
    ar: "أثناء الغياب تُجمَّد إجراءات المراجعة. اختاروا محررًا واحدًا لرفعه مؤقتًا إلى مراجع. يُبلَّغ كل المحررين. يعود الدور عند إنهاء الغياب أو انقضاء التاريخ.",
  },
  awayCurrently: { en: "Currently Away", ar: "غائب حاليًا" },
  awayUntil: { en: "until {date}", ar: "حتى {date}" },
  awayTempReviewer: { en: "temp Reviewer: {name}", ar: "مراجع مؤقت: {name}" },
  notAway: { en: "Not Away.", ar: "غير غائب." },
  awayElevateEditor: {
    en: "Elevate Editor (required)",
    ar: "رفع محرر (مطلوب)",
  },
  awaySelectEditor: { en: "— select Editor —", ar: "— اختاروا محررًا —" },
  awayUntilDate: { en: "Until date (optional)", ar: "حتى تاريخ (اختياري)" },
  awaySet: { en: "Set Away", ar: "تفعيل الغياب" },
  awayClear: { en: "Clear Away", ar: "إنهاء الغياب" },
  awayClearing: { en: "Clearing…", ar: "جارٍ الإنهاء…" },
  awaySetSuccess: { en: "Away set.", ar: "تم تفعيل الغياب." },
  awayClearedSuccess: { en: "Away cleared.", ar: "تم إنهاء الغياب." },
  awayLoadFailed: {
    en: "Failed to load Away state",
    ar: "تعذّر تحميل حالة الغياب",
  },
  actionFailedShort: { en: "Failed", ar: "فشل" },
  users: { en: "Users", ar: "المستخدمون" },
  pageDescUsers: {
    en: "Add and manage staff accounts. Organisation units are configured separately.",
    ar: "إضافة حسابات الموظفين وإدارتها. تُضبط الوحدات التنظيمية بشكل منفصل.",
  },
  usersOrgUnitsLink: { en: "Organisation units", ar: "الوحدات التنظيمية" },
  usersOrgUnitsHint: {
    en: "To add or rename departments and centres, open Organisation units.",
    ar: "لإضافة الأقسام والمراكز أو إعادة تسميتها، افتحوا الوحدات التنظيمية.",
  },
  usersCreateTitle: { en: "Add user", ar: "إضافة مستخدم" },
  usersEmail: {
    en: "Email address (sign-in)",
    ar: "البريد الإلكتروني (لتسجيل الدخول)",
  },
  usersTempPassword: { en: "Temporary password", ar: "كلمة مرور مؤقتة" },
  usersDisplayName: {
    en: "Short name (lists and menus)",
    ar: "الاسم المختصر (القوائم)",
  },
  usersRole: { en: "Role", ar: "الدور" },
  usersOrgsEditor: { en: "Organisation units *", ar: "الوحدات التنظيمية *" },
  usersOrgsReviewer: {
    en: "Organisation units * (one reviewer per unit)",
    ar: "الوحدات التنظيمية * (مراجع واحد لكل وحدة)",
  },
  usersOrgsReviewerHint: {
    en: "Two reviewers cannot share the same organisation unit.",
    ar: "لا يمكن لمراجعين مشاركة الوحدة التنظيمية نفسها.",
  },
  usersContentTypes: { en: "Content types *", ar: "أنواع المحتوى *" },
  usersContentTypesHint: {
    en: "Only types allowed for the selected units. Each type can be assigned to one editor.",
    ar: "الأنواع المسموح بها للوحدات المحددة فقط. يُسند كل نوع إلى محرر واحد.",
  },
  usersTypeNotInOrgs: {
    en: "not available for selected units",
    ar: "غير متاح للوحدات المحددة",
  },
  usersTypeHeldBy: { en: "assigned to {email}", ar: "مسند إلى {email}" },
  usersReviewerNoTypes: {
    en: "Reviewers work with content types allowed by their organisation units.",
    ar: "يعمل المراجعون بأنواع المحتوى المسموح بها ضمن وحداتهم التنظيمية.",
  },
  usersSaAutoAccess: {
    en: "Super administrators automatically have access to all organisation units and content types.",
    ar: "يحصل المشرف الأعلى تلقائيًا على الوصول إلى كل الوحدات وأنواع المحتوى.",
  },
  usersCreate: { en: "Add user", ar: "إضافة مستخدم" },
  usersCreating: { en: "Adding…", ar: "جارٍ الإضافة…" },
  usersCreated: { en: "User added.", ar: "تمت إضافة المستخدم." },
  usersCreateFailed: { en: "Could not add user.", ar: "تعذّرت إضافة المستخدم." },
  usersUpdated: { en: "Changes saved.", ar: "تم حفظ التغييرات." },
  usersUpdateFailed: {
    en: "Could not save changes.",
    ar: "تعذّر حفظ التغييرات.",
  },
  usersColUser: { en: "User", ar: "المستخدم" },
  usersColRole: { en: "Role", ar: "الدور" },
  usersColAccess: { en: "Access", ar: "الصلاحيات" },
  usersColStatus: { en: "Status", ar: "الحالة" },
  usersColActions: { en: "Actions", ar: "الإجراءات" },
  usersStatusActive: { en: "Active", ar: "نشط" },
  usersStatusInactive: { en: "Inactive", ar: "غير نشط" },
  usersOrgsShort: { en: "Organisation units", ar: "الوحدات التنظيمية" },
  usersTypesShort: { en: "Content types", ar: "أنواع المحتوى" },
  usersSaveAccess: { en: "Save access", ar: "حفظ الصلاحيات" },
  usersCancel: { en: "Cancel", ar: "إلغاء" },
  usersDeactivate: { en: "Deactivate", ar: "إلغاء التفعيل" },
  usersActivate: { en: "Activate", ar: "تفعيل" },
  usersResetPassword: { en: "Reset password", ar: "إعادة تعيين كلمة المرور" },
  usersResetPasswordPrompt: {
    en: "New password for {email} (at least 8 characters):",
    ar: "كلمة المرور الجديدة لـ {email} (8 أحرف على الأقل):",
  },
  usersEditAccess: { en: "Edit access", ar: "تعديل الصلاحيات" },
  usersDelete: { en: "Remove…", ar: "إزالة…" },
  usersDeleteTitle: { en: "Remove {email}?", ar: "إزالة {email}؟" },
  usersDeleteHint: {
    en: "This permanently removes the account. Drafts ({drafts}) will be deleted. Items already in review or published ({items}) must be handed to another user first.",
    ar: "يؤدي هذا إلى إزالة الحساب نهائيًا. ستُحذف المسودات ({drafts}). العناصر قيد المراجعة أو المنشورة ({items}) يجب تسليمها لمستخدم آخر أولًا.",
  },
  usersDeleteLastSa: {
    en: "You cannot remove the last active Super administrator.",
    ar: "لا يمكن إزالة آخر مشرف أعلى نشط.",
  },
  usersReassignTo: { en: "Hand these items to:", ar: "تسليم هذه العناصر إلى:" },
  usersSelectUser: { en: "Select a user…", ar: "اختاروا مستخدمًا…" },
  usersConfirmEmail: {
    en: "Type the email address to confirm",
    ar: "اكتبوا البريد الإلكتروني للتأكيد",
  },
  usersDeleting: { en: "Removing…", ar: "جارٍ الإزالة…" },
  usersDeleteConfirm: { en: "Remove permanently", ar: "إزالة نهائيًا" },
  usersDeleted: { en: "User removed.", ar: "تمت إزالة المستخدم." },
  usersDeleteImpactFailed: {
    en: "Could not check what this account owns.",
    ar: "تعذّر التحقق مما يملكه هذا الحساب.",
  },
  usersTypeNotInUnitsShort: {
    en: "not in selected units",
    ar: "ليس في الوحدات المحددة",
  },
  pageDescOrgUnits: {
    en: "Add and rename centre-wide and research departments. Content types follow each unit’s kind automatically.",
    ar: "إضافة مراكز وأقسام بحث وإعادة تسميتها. تُحدَّد أنواع المحتوى تلقائيًا حسب نوع الوحدة.",
  },
  orgCreateTitle: { en: "Add organisation unit", ar: "إضافة وحدة تنظيمية" },
  orgCreateHint: {
    en: "Centre-wide units cover centre content. Research departments cover research groups and projects. Assign editors afterward on Users.",
    ar: "الوحدات على مستوى المركز تغطي محتوى المركز. أقسام البحث تغطي الفرق والمشاريع. عيّنوا المحررين بعد ذلك من صفحة المستخدمين.",
  },
  orgNameEn: { en: "Name (English) *", ar: "الاسم (إنجليزي) *" },
  orgNameAr: { en: "Name (Arabic) *", ar: "الاسم (عربي) *" },
  orgKind: { en: "Type *", ar: "النوع *" },
  orgKindCentreWide: { en: "Centre-wide", ar: "على مستوى المركز" },
  orgKindResearchDept: { en: "Research department", ar: "قسم بحثي" },
  orgIdOptional: {
    en: "Code (optional)",
    ar: "الرمز (اختياري)",
  },
  orgIdPlaceholder: {
    en: "Generated from the English name if left blank",
    ar: "يُولَّد من الاسم الإنجليزي إن تُرك فارغًا",
  },
  orgSortOptional: { en: "Display order (optional)", ar: "ترتيب العرض (اختياري)" },
  orgSortPlaceholder: { en: "Automatic", ar: "تلقائي" },
  orgCreate: { en: "Add unit", ar: "إضافة وحدة" },
  orgCreating: { en: "Adding…", ar: "جارٍ الإضافة…" },
  orgCreated: { en: "Organisation unit added.", ar: "تمت إضافة الوحدة التنظيمية." },
  orgCreateFailed: {
    en: "Could not add organisation unit.",
    ar: "تعذّرت إضافة الوحدة التنظيمية.",
  },
  orgUpdated: { en: "Changes saved.", ar: "تم حفظ التغييرات." },
  orgUpdateFailed: {
    en: "Could not save changes.",
    ar: "تعذّر حفظ التغييرات.",
  },
  orgColName: { en: "Name", ar: "الاسم" },
  orgColKind: { en: "Type", ar: "النوع" },
  orgColSort: { en: "Order", ar: "الترتيب" },
  orgColActions: { en: "Actions", ar: "الإجراءات" },
  orgEdit: { en: "Edit", ar: "تعديل" },
  orgSave: { en: "Save", ar: "حفظ" },
  orgCancel: { en: "Cancel", ar: "إلغاء" },
  orgDelete: { en: "Remove", ar: "إزالة" },
  orgDeleted: { en: "Organisation unit removed.", ar: "تمت إزالة الوحدة التنظيمية." },
  orgDeleteFailed: {
    en: "Could not remove organisation unit.",
    ar: "تعذّرت إزالة الوحدة التنظيمية.",
  },
  orgDeleteImpactFailed: {
    en: "Could not check whether this unit is in use.",
    ar: "تعذّر التحقق مما إذا كانت هذه الوحدة قيد الاستخدام.",
  },
  orgDeleteBlockedContent: {
    en: "Cannot remove “{name}”: {count} content item(s) still use it. Move or reassign that content first.",
    ar: "لا يمكن إزالة «{name}»: ما زال {count} عنصر(عناصر) محتوى يستخدمها. انقلوا أو أعيدوا إسناد ذلك المحتوى أولًا.",
  },
  orgDeleteConfirm: {
    en: "Remove “{name}”? This also clears access for {users} user(s){reviewer}.",
    ar: "إزالة «{name}»؟ سيُزال أيضًا وصول {users} مستخدم(ين){reviewer}.",
  },
  orgDeleteConfirmReviewer: {
    en: ", including the reviewer assignment",
    ar: "، بما في ذلك إسناد المراجع",
  },
  orgUnits: { en: "Organisation units", ar: "الوحدات التنظيمية" },
  editors: { en: "Editors", ar: "المحررون" },
  pageDescEditors: {
    en: "Assign which content types each editor may work on. Each type can belong to only one editor.",
    ar: "عيّنوا أنواع المحتوى التي يعمل عليها كل محرر. يُسند كل نوع إلى محرر واحد فقط.",
  },
  editorsHintReviewer: {
    en: "Editors in your organisation units. Assign content types here; account and unit access are managed on Users.",
    ar: "المحررون ضمن وحداتكم التنظيمية. عيّنوا أنواع المحتوى هنا؛ تُدار الحسابات ووصول الوحدات من صفحة المستخدمين.",
  },
  editorsHintSa: {
    en: "All editors. Use Users for accounts and organisation-unit access; use this page for content-type assignments.",
    ar: "كل المحررين. استخدموا صفحة المستخدمين للحسابات ووصول الوحدات؛ وهذه الصفحة لإسناد أنواع المحتوى.",
  },
  editorsEmpty: {
    en: "No editors assigned yet.",
    ar: "لا محررين معيّنين بعد.",
  },
  editorsOrgs: { en: "Organisation units", ar: "الوحدات التنظيمية" },
  editorsContentTypes: { en: "Content types", ar: "أنواع المحتوى" },
  editorsSave: { en: "Save assignments", ar: "حفظ الإسنادات" },
  editorsSaved: {
    en: "Content type assignments saved.",
    ar: "تم حفظ إسنادات أنواع المحتوى.",
  },
  editorsSaveFailed: {
    en: "Could not save assignments.",
    ar: "تعذّر حفظ الإسنادات.",
  },
  editorsTypeNotAvailable: {
    en: "Not available for this editor’s units",
    ar: "غير متاح لوحدات هذا المحرر",
  },
  editorsTypeHeldBy: {
    en: "Assigned to {email}",
    ar: "مسند إلى {email}",
  },
  audit: { en: "Audit log", ar: "سجل التدقيق" },
  pageDescAudit: {
    en: "A permanent record of sign-ins, account changes, content decisions, media, and publishing.",
    ar: "سجل دائم لعمليات تسجيل الدخول وتغييرات الحسابات وقرارات المحتوى والوسائط والنشر.",
  },
  auditFilterAction: { en: "Action", ar: "الإجراء" },
  auditFilterActionAll: { en: "All actions", ar: "كل الإجراءات" },
  auditFilterActor: { en: "Person (email)", ar: "الشخص (البريد)" },
  auditFilterActorPh: { en: "Exact email address", ar: "البريد الإلكتروني بالكامل" },
  auditFilterEntity: { en: "Related to", ar: "متعلق بـ" },
  auditFilterEntityAll: { en: "Everything", ar: "الكل" },
  auditFilterFrom: { en: "From", ar: "من" },
  auditFilterTo: { en: "To", ar: "إلى" },
  auditApply: { en: "Apply filters", ar: "تطبيق عوامل التصفية" },
  auditClear: { en: "Clear filters", ar: "مسح عوامل التصفية" },
  auditEmpty: {
    en: "No entries match these filters.",
    ar: "لا توجد إدخالات مطابقة لعوامل التصفية هذه.",
  },
  auditNoActor: { en: "System / unknown", ar: "النظام / غير معروف" },
  auditEntityUser: { en: "Users", ar: "المستخدمون" },
  auditEntityMedia: { en: "Media", ar: "الوسائط" },
  auditEntityOrg: { en: "Organisation units", ar: "الوحدات التنظيمية" },
  auditActionLoginOk: { en: "Signed in", ar: "تسجيل دخول ناجح" },
  auditActionLoginFail: { en: "Sign-in failed", ar: "فشل تسجيل الدخول" },
  auditActionLogout: { en: "Signed out", ar: "تسجيل الخروج" },
  auditActionUserCreate: { en: "User added", ar: "إضافة مستخدم" },
  auditActionUserActivate: { en: "User activated", ar: "تفعيل مستخدم" },
  auditActionUserDeactivate: { en: "User deactivated", ar: "إلغاء تفعيل مستخدم" },
  auditActionUserResetPassword: { en: "Password reset", ar: "إعادة تعيين كلمة المرور" },
  auditActionUserUpdateAccess: { en: "User access updated", ar: "تحديث صلاحيات مستخدم" },
  auditActionUserUpdateProfile: { en: "Profile updated", ar: "تحديث الملف الشخصي" },
  auditActionUserDelete: { en: "User removed", ar: "إزالة مستخدم" },
  auditActionUserAwaySet: { en: "Away set", ar: "تفعيل الغياب" },
  auditActionUserAwayCleared: { en: "Away cleared", ar: "إنهاء الغياب" },
  auditActionOrgCreate: { en: "Organisation unit added", ar: "إضافة وحدة تنظيمية" },
  auditActionOrgUpdate: { en: "Organisation unit updated", ar: "تحديث وحدة تنظيمية" },
  auditActionOrgDelete: { en: "Organisation unit removed", ar: "إزالة وحدة تنظيمية" },
  auditActionMediaUpload: { en: "Media uploaded", ar: "رفع وسائط" },
  auditActionMediaReplace: { en: "Media replaced", ar: "استبدال وسائط" },
  auditActionMediaDelete: { en: "Media deleted", ar: "حذف وسائط" },
  auditActionContentReassign: { en: "Author reassigned", ar: "إعادة إسناد المؤلف" },
  auditActionReviewOwnerProposed: {
    en: "Review owner proposed",
    ar: "اقتراح مسؤول المراجعة",
  },
  auditActionReviewOwnerSet: { en: "Review owner set", ar: "تعيين مسؤول المراجعة" },
  auditActionReviewOwnerRejected: {
    en: "Review owner proposal rejected",
    ar: "رفض اقتراح مسؤول المراجعة",
  },
  auditActionEscalated: { en: "Escalated", ar: "تصعيد" },
  auditVerbCreate: { en: "Created", ar: "إنشاء" },
  auditVerbSubmit: { en: "Submitted for review", ar: "إرسال للمراجعة" },
  auditVerbApprove: { en: "Approved", ar: "موافقة" },
  auditVerbReject: { en: "Rejected", ar: "رفض" },
  auditVerbChangesRequested: { en: "Changes requested", ar: "طلب تعديلات" },
  auditVerbPublish: { en: "Published", ar: "نشر" },
  auditVerbUnpublish: { en: "Unpublished", ar: "إلغاء النشر" },
  auditVerbPreview: { en: "Preview opened", ar: "فتح معاينة" },
  auditVerbDelete: { en: "Deleted", ar: "حذف" },
  auditVerbStartRevision: { en: "Revision started", ar: "بدء تعديل" },
  auditVerbRestoreRevision: { en: "Revision restored", ar: "استعادة مراجعة" },
  auditVerbReopenRejected: { en: "Rejected item reopened", ar: "إعادة فتح عنصر مرفوض" },
  auditVerbEmergencyPublish: { en: "Emergency publish", ar: "نشر طارئ" },
  auditVerbPostReviewOk: { en: "Post-review confirmed", ar: "تأكيد المراجعة اللاحقة" },
  auditVerbPostReviewChanges: {
    en: "Post-review: changes requested",
    ar: "مراجعة لاحقة: طلب تعديلات",
  },
  auditVerbPostReviewUnpublish: {
    en: "Unpublished after emergency",
    ar: "إلغاء النشر بعد النشر الطارئ",
  },
  auditActionTyped: { en: "{type} · {verb}", ar: "{type} · {verb}" },
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
  breadcrumbNew: { en: "New", ar: "جديد" },

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
  fieldNewsImage: { en: "News image (primary)", ar: "صورة الخبر (أساسية)" },
  draftCreated: { en: "Draft created.", ar: "تم إنشاء المسودة." },
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
  emptyFiltered: {
    en: "No items match this search.",
    ar: "لا عناصر تطابق هذا البحث.",
  },
  clearFilters: { en: "Clear filters", ar: "مسح التصفية" },
  emptyCreateHint: {
    en: "Create the first one to get started.",
    ar: "أنشئ العنصر الأول للبدء.",
  },
  filterAllStatus: { en: "All statuses", ar: "كل الحالات" },
  filterSearch: { en: "Search…", ar: "بحث…" },
  filterApply: { en: "Filter", ar: "تصفية" },
  newArticle: { en: "New article", ar: "مقال جديد" },
  newPartner: { en: "New partner", ar: "شريك جديد" },
  newLaw: { en: "New law", ar: "نص قانوني جديد" },
  newPlatform: { en: "New platform", ar: "منصة جديدة" },
  createLaw: { en: "Create law / decree", ar: "إنشاء قانون / مرسوم" },
  createPlatform: { en: "Create platform", ar: "إنشاء منصة" },
  emptyLaws: { en: "No laws yet.", ar: "لا نصوص بعد." },
  emptyPlatforms: { en: "No platforms yet.", ar: "لا منصات بعد." },
  pageDescLaws: { en: "Manage laws and decrees linked from the public site.", ar: "إدارة القوانين والمراسيم المعروضة على الموقع." },
  pageDescPlatforms: { en: "Manage visual, radio, and mobility platforms.", ar: "إدارة المنصات المرئية والإذاعية والتنقل." },
  fieldExternalUrl: { en: "External URL", ar: "رابط خارجي" },
  fieldPlatformKind: { en: "Platform kind", ar: "نوع المنصة" },
  platformKindVisual: { en: "Visual lectures", ar: "محاضرات مرئية" },
  platformKindRadio: { en: "Radio lectures", ar: "محاضرات إذاعية" },
  platformKindMobility: { en: "Short-term mobility", ar: "تنقل قصير المدى" },
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
  pageDescNews: {
    en: "Manage centre news articles: draft in Arabic, submit for review, then publish to the public site.",
    ar: "إدارة أخبار المركز: حرّروا المسودة بالعربية، أرسلوها للمراجعة، ثم انشروها على الموقع العام.",
  },
  pageDescEvents: {
    en: "Manage conferences, seminars, and other events shown on the public calendar and listings.",
    ar: "إدارة المؤتمرات والندوات وسائر الفعاليات المعروضة في رزنامة الموقع وقوائمه.",
  },
  pageDescPublications: {
    en: "Manage books and publications with cover images for the public catalogue.",
    ar: "إدارة الكتب والمنشورات مع صور الأغلفة في فهرس الموقع العام.",
  },
  pageDescPartners: {
    en: "Manage national and international partners featured on the public site.",
    ar: "إدارة الشركاء الوطنيين والدوليين المعروضين على الموقع العام.",
  },
  pageDescAlerts: {
    en: "Manage the site-wide alert banner. Only one alert can be live on the public site at a time.",
    ar: "إدارة شريط التنبيه على مستوى الموقع. يُعرض تنبيه واحد فقط على الموقع العام في الوقت نفسه.",
  },
  pageDescResearchGroups: {
    en: "Manage research groups linked to departments, including members and summaries.",
    ar: "إدارة الفرق البحثية المرتبطة بالأقسام، بما في ذلك الأعضاء والملخصات.",
  },
  pageDescResearchProjects: {
    en: "Manage research projects under their groups: questions, axes, duration, and impacts.",
    ar: "إدارة المشاريع البحثية ضمن فرقها: الأسئلة والمحاور والمدة والأثر.",
  },
  alertsExclusivity: {
    en: "At most one alert is live on the public site at a time.",
    ar: "يُعرض تنبيه واحد فقط على الموقع العام في الوقت نفسه.",
  },
  searchNews: { en: "Search news…", ar: "بحث في الأخبار…" },
  searchEvents: { en: "Search events…", ar: "بحث في الفعاليات…" },
  searchPublications: { en: "Search publications…", ar: "بحث في المنشورات…" },
  createNews: { en: "Create news", ar: "إنشاء خبر" },
  createEvent: { en: "Create event", ar: "إنشاء فعالية" },
  createPublication: { en: "Create publication", ar: "إنشاء منشور" },
  createPartner: { en: "Create partner", ar: "إنشاء شريك" },
  createAlert: { en: "Create alert", ar: "إنشاء تنبيه" },
  createResearchGroup: { en: "Create research group", ar: "إنشاء فريق بحثي" },
  createResearchProject: { en: "Create research project", ar: "إنشاء مشروع بحثي" },
  createNewsHint: {
    en: "Arabic-first draft. Submit when ready for review.",
    ar: "مسودة بالعربية أولًا. أرسلوا للمراجعة عند الجاهزية.",
  },
  needsPostPublicationReview: {
    en: "Needs post-publication review",
    ar: "يلزم مراجعة بعد النشر",
  },
  pendingReviewOwnerProposals: {
    en: "Pending review-owner proposals",
    ar: "اقتراحات مسؤول المراجعة المعلّقة",
  },
  fieldScope: { en: "Scope", ar: "النطاق" },
  fieldDate: { en: "Date *", ar: "التاريخ *" },
  fieldPartnerNameAr: { en: "Partner name (Arabic) *", ar: "اسم الشريك (عربي) *" },
  fieldPartnerNameEn: { en: "Partner name (English)", ar: "اسم الشريك (إنجليزي)" },
  fieldCountryAr: { en: "Country (Arabic) *", ar: "البلد (عربي) *" },
  fieldCountryEn: { en: "Country (English)", ar: "البلد (إنجليزي)" },
  fieldEmojiOptional: { en: "Emoji (optional)", ar: "رمز تعبيري (اختياري)" },
  fieldDisplayStatus: { en: "Display status", ar: "حالة العرض" },
  fieldDay: { en: "Day *", ar: "اليوم *" },
  fieldMonthAr: { en: "Month (Arabic display) *", ar: "الشهر (عرض عربي) *" },
  fieldYear: { en: "Year *", ar: "السنة *" },
  fieldTypeAr: { en: "Type (Arabic) *", ar: "النوع (عربي) *" },
  fieldTypeEn: { en: "Type (English)", ar: "النوع (إنجليزي)" },
  fieldTypeRequired: { en: "Type *", ar: "النوع *" },
  fieldDepartmentAr: { en: "Department (Arabic) *", ar: "القسم (عربي) *" },
  fieldDepartmentEn: { en: "Department (English)", ar: "القسم (إنجليزي)" },
  fieldDescriptionAr: { en: "Description (Arabic) *", ar: "الوصف (عربي) *" },
  fieldDescriptionEn: { en: "Description (English)", ar: "الوصف (إنجليزي)" },
  fieldCoverAltAr: { en: "Cover alt (Arabic) *", ar: "النص البديل للغلاف (عربي) *" },
  fieldCoverAltEn: { en: "Cover alt (English)", ar: "النص البديل للغلاف (إنجليزي)" },
  fieldPublicSlugOptional: { en: "Public slug (optional)", ar: "المعرّف العام (اختياري)" },
  fieldBannerMessageAr: { en: "Banner message (Arabic) *", ar: "رسالة الشريط (عربية) *" },
  fieldBannerMessageEn: { en: "Banner message (English)", ar: "رسالة الشريط (إنجليزية)" },
  fieldLinkUrlOptional: { en: "Link URL (optional)", ar: "رابط (اختياري)" },
  fieldLinkLabelAr: { en: "Link label (Arabic)", ar: "تسمية الرابط (عربية)" },
  fieldLinkLabelEn: { en: "Link label (English)", ar: "تسمية الرابط (إنجليزية)" },
  fieldGroupNameAr: { en: "Group name (Arabic) *", ar: "اسم الفريق (عربي) *" },
  fieldGroupNameEn: { en: "Group name (English)", ar: "اسم الفريق (إنجليزي)" },
  fieldLeadAr: { en: "Lead (Arabic) *", ar: "المشرف (عربي) *" },
  fieldLeadEn: { en: "Lead (English)", ar: "المشرف (إنجليزي)" },
  fieldLeadArRequired: { en: "Lead (Arabic) *", ar: "المشرف (عربي) *" },
  fieldSummaryArRequired: { en: "Summary (Arabic) *", ar: "الملخص (عربي) *" },
  fieldResearchGroupRequired: { en: "Research group *", ar: "الفريق البحثي *" },
  fieldProjectTitleAr: { en: "Project title (Arabic) *", ar: "عنوان المشروع (عربي) *" },
  fieldProjectTitleEn: { en: "Project title (English)", ar: "عنوان المشروع (إنجليزي)" },
  fieldQuestionsAr: { en: "Research questions (Arabic)", ar: "أسئلة البحث (عربية)" },
  fieldQuestionsEn: { en: "Research questions (English)", ar: "أسئلة البحث (إنجليزية)" },
  fieldDurationAr: { en: "Duration (Arabic)", ar: "المدة (عربية)" },
  fieldDurationEn: { en: "Duration (English)", ar: "المدة (إنجليزية)" },
  fieldImage: { en: "Image", ar: "صورة" },
  fieldEventImage: { en: "Event image (optional)", ar: "صورة الفعالية (اختياري)" },
  fieldCoverImage: { en: "Cover image *", ar: "صورة الغلاف *" },
  fieldLogoImage: { en: "Logo / image", ar: "الشعار / الصورة" },
  fieldGroupImage: { en: "Group image", ar: "صورة الفريق" },
  fieldScopeNationalOpt: { en: "National (nat)", ar: "وطني (nat)" },
  fieldScopeInternationalOpt: { en: "International (intl)", ar: "دولي (intl)" },

  sectionMembers: { en: "Members", ar: "الأعضاء" },
  sectionDetails: { en: "Details", ar: "التفاصيل" },
  fieldResearchAxes: { en: "Research axes", ar: "محاور البحث" },
  fieldImpacts: { en: "Impacts", ar: "الأثر" },
  phAxisAr: { en: "Axis (AR)", ar: "المحور (عربي)" },
  phAxisEn: { en: "Axis (EN)", ar: "المحور (إنجليزي)" },
  phImpactAr: { en: "Impact (AR)", ar: "الأثر (عربي)" },
  phImpactEn: { en: "Impact (EN)", ar: "الأثر (إنجليزي)" },
  phNameAr: { en: "Name (AR)", ar: "الاسم (عربي)" },
  phNameEn: { en: "Name (EN)", ar: "الاسم (إنجليزي)" },
  actionRemove: { en: "Remove", ar: "إزالة" },
  actionAddAxis: { en: "+ Add axis", ar: "+ إضافة محور" },
  actionAddImpact: { en: "+ Add impact", ar: "+ إضافة أثر" },
  actionAddMember: { en: "+ Add member", ar: "+ إضافة عضو" },
  loadingGroups: { en: "Loading groups…", ar: "جارٍ تحميل الفرق…" },
  noPublishedGroups: {
    en: "No published research groups for this org yet. Publish one first.",
    ar: "لا فرق بحثية منشورة لهذه الوحدة بعد. انشروا فريقًا أولًا.",
  },
  softLimitSummary: {
    en: "Soft limit {n} characters for card teasers ({current} now). Saving is still allowed.",
    ar: "حد مرن {n} حرفًا لملخص البطاقة (الحالي {current}). الحفظ ما زال مسموحًا.",
  },

  attachmentsTitle: { en: "Attachments (images + PDFs)", ar: "المرفقات (صور وملفات PDF)" },
  attachmentsHint: {
    en: "First image is the public card cover. Max 5 MB each · JPEG / PNG / WebP / PDF.",
    ar: "الصورة الأولى هي غلاف البطاقة العامة. الحد الأقصى 5 ميغابايت لكل ملف · JPEG / PNG / WebP / PDF.",
  },
  dragDropFile: { en: "Drag & drop a file here", ar: "اسحبوا ملفًا وأفلتوه هنا" },
  browseFiles: { en: "Browse files", ar: "استعراض الملفات" },
  noAttachments: { en: "No attachments yet.", ar: "لا مرفقات بعد." },
  uploading: { en: "Uploading…", ar: "جارٍ الرفع…" },
  uploadFailed: { en: "Upload failed", ar: "فشل الرفع" },
  uploadedShort: { en: "Uploaded.", ar: "تم الرفع." },
  openImagePreview: { en: "Open image preview", ar: "فتح معاينة الصورة" },
  cardCoverSuffix: { en: " · card cover", ar: " · غلاف البطاقة" },
  attachmentsFormatsHint: {
    en: "Max 5 MB · JPEG / PNG / WebP / PDF ·",
    ar: "الحد الأقصى 5 ميغابايت · JPEG / PNG / WebP / PDF ·",
  },

  commentsTitle: { en: "Comments", ar: "التعليقات" },
  commentsHint: {
    en: "Append-only thread. Request changes / reject notes appear here automatically.",
    ar: "سلسلة تعليقات للإضافة فقط. تظهر هنا تلقائيًا ملاحظات طلب التعديل أو الرفض.",
  },
  commentsOnlyAuthorReviewer: {
    en: "Only the author, Reviewer, or Super Admin can comment on this item.",
    ar: "يمكن للمؤلف أو المراجع أو المشرف العام فقط التعليق على هذا العنصر.",
  },
  addCommentPh: { en: "Add a comment…", ar: "أضيفوا تعليقًا…" },
  postComment: { en: "Post comment", ar: "نشر التعليق" },
  posting: { en: "Posting…", ar: "جارٍ النشر…" },
  loadingEllipsis: { en: "Loading…", ar: "جارٍ التحميل…" },
  noComments: { en: "No comments yet.", ar: "لا تعليقات بعد." },
  badgeChangesRequested: { en: "Changes requested", ar: "طُلبت تعديلات" },
  badgeRejected: { en: "Rejected", ar: "مرفوض" },

  revisionHistory: { en: "Revision history", ar: "سجل المراجعات" },
  revisionHistoryHint: {
    en: "Select a revision to inspect. Optionally compare with a prior revision (read-only).",
    ar: "اختاروا مراجعة للاطلاع. يمكن اختياريًا المقارنة مع مراجعة سابقة (للقراءة فقط).",
  },
  noRevisions: { en: "No revisions recorded yet.", ar: "لا مراجعات مسجّلة بعد." },
  viewLabel: { en: "View", ar: "عرض" },
  compareWithOptional: { en: "Compare with (optional)", ar: "مقارنة مع (اختياري)" },
  compareNone: { en: "— none —", ar: "— لا شيء —" },
  colField: { en: "Field", ar: "الحقل" },
  colSelected: { en: "Selected", ar: "المحدّد" },
  restoreRevision: {
    en: "Restore this revision (→ draft)",
    ar: "استعادة هذه المراجعة (→ مسودة)",
  },
  restoring: { en: "Restoring…", ar: "جارٍ الاستعادة…" },

  seoShare: { en: "SEO / share", ar: "تحسين الظهور / المشاركة" },
  seoShareHint: {
    en: "Optional. Empty fields fall back to title / summary / primary image on the public site. Max {titleMax} (title) / {descMax} (description).",
    ar: "اختياري. الحقول الفارغة تعود إلى العنوان / الملخص / الصورة الأساسية على الموقع. الحد الأقصى {titleMax} (العنوان) / {descMax} (الوصف).",
  },
  copyMetaTitleAr: {
    en: "Copy meta title from AR title",
    ar: "نسخ عنوان الميتا من العنوان العربي",
  },
  copyMetaDescAr: {
    en: "Copy meta description from AR summary",
    ar: "نسخ وصف الميتا من الملخص العربي",
  },
  ogImagePath: { en: "Share image", ar: "صورة المشاركة" },
  selectOgImage: { en: "Select OG image", ar: "اختيار صورة المشاركة" },
  reviewOwnerTitle: { en: "Review owner", ar: "مسؤول المراجعة" },
  reviewOwnerHint: {
    en: "The reviewer responsible for this item. Reviewers propose a change; a Super administrator confirms it. Super administrators can set the owner immediately.",
    ar: "المراجع المسؤول عن هذا العنصر. يقترح المراجعون تغييرًا ويؤكده المشرف الأعلى. يمكن للمشرف الأعلى تعيين المسؤول فورًا.",
  },
  reviewOwnerCurrent: { en: "Current", ar: "الحالي" },
  reviewOwnerPending: { en: "Pending", ar: "قيد الانتظار" },
  reviewOwnerBy: { en: "by {name}", ar: "بواسطة {name}" },
  reviewOwnerSelect: {
    en: "— select review owner —",
    ar: "— اختاروا مسؤول المراجعة —",
  },
  reviewOwnerPropose: { en: "Propose owner", ar: "اقتراح مسؤول" },
  reviewOwnerSet: { en: "Set owner", ar: "تعيين المسؤول" },
  reviewOwnerConfirm: { en: "Confirm proposal", ar: "تأكيد الاقتراح" },
  reviewOwnerReject: { en: "Reject proposal", ar: "رفض الاقتراح" },
  reviewOwnerProposedOk: {
    en: "Proposal sent for confirmation.",
    ar: "أُرسل الاقتراح للتأكيد.",
  },
  reviewOwnerSaved: { en: "Review owner updated.", ar: "تم تحديث مسؤول المراجعة." },

  reassignAuthor: { en: "Reassign author", ar: "إعادة تعيين المؤلف" },
  reassignHint: {
    en: "Hand this item to another active user while it is still a draft, changes-requested, or submitted. Reviewers may assign to editors or reviewers; only a Super administrator may assign to another Super administrator.",
    ar: "سلّموا هذا العنصر لمستخدم نشط آخر ما دام مسودة أو طُلبت تعديلات أو أُرسل للمراجعة. يمكن للمراجعين الإسناد إلى محررين أو مراجعين؛ والمشرف الأعلى وحده يمكنه الإسناد إلى مشرف أعلى آخر.",
  },
  reassignSelectUser: { en: "— select user —", ar: "— اختاروا مستخدمًا —" },
  reassignCurrentSuffix: { en: " — current", ar: " — الحالي" },
  reassignAction: { en: "Reassign", ar: "إعادة الإسناد" },
  reassignPending: { en: "Reassigning…", ar: "جارٍ إعادة الإسناد…" },
  reassignSuccess: { en: "Author reassigned.", ar: "أُعيد إسناد المؤلف." },
  reassignFailed: { en: "Could not reassign author.", ar: "تعذّرت إعادة إسناد المؤلف." },

  escalateTitle: { en: "Escalate", ar: "تصعيد" },
  escalateHint: {
    en: "Notify a Super administrator and add a note to the comment thread. A note is required.",
    ar: "بلّغوا المشرف الأعلى وأضيفوا ملاحظة إلى سلسلة التعليقات. الملاحظة مطلوبة.",
  },
  escalateLastAt: { en: "Last escalated: {when}", ar: "آخر تصعيد: {when}" },
  escalateAt: { en: "Escalated at {when}", ar: "صُعِّد في {when}" },
  escalatePlaceholder: { en: "Why escalate?", ar: "لماذا التصعيد؟" },
  escalateAction: { en: "Escalate to Super administrator", ar: "تصعيد إلى المشرف الأعلى" },
  escalatePending: { en: "Escalating…", ar: "جارٍ التصعيد…" },
  escalateSuccess: {
    en: "Escalated to Super administrator.",
    ar: "تم التصعيد إلى المشرف الأعلى.",
  },
  escalateFailed: { en: "Could not escalate.", ar: "تعذّر التصعيد." },

  emergencyPublish: { en: "Emergency publish", ar: "نشر طارئ" },
  emergencyHint: {
    en: "Super administrator only: publish immediately and require a review afterward. A reason is required and is saved in comments and the audit log.",
    ar: "للمشرف الأعلى فقط: انشروا فورًا واشترطوا مراجعة لاحقة. السبب مطلوب ويُحفظ في التعليقات وسجل التدقيق.",
  },
  emergencyBy: { en: "by {name}", ar: "بواسطة {name}" },
  emergencyReasonLabel: { en: "Reason: {reason}", ar: "السبب: {reason}" },
  emergencyReasonPh: {
    en: "Why publish as an emergency?",
    ar: "لماذا النشر الطارئ؟",
  },
  emergencyPublishNow: { en: "Emergency publish now", ar: "نشر طارئ الآن" },
  emergencyPublishing: { en: "Publishing…", ar: "جارٍ النشر…" },
  emergencyPostReviewTitle: {
    en: "Post-publication review",
    ar: "المراجعة بعد النشر",
  },
  emergencyConfirmOk: { en: "Confirm OK", ar: "تأكيد الموافقة" },
  emergencyConfirmBlocked: {
    en: "The Super administrator who emergency-published cannot Confirm OK",
    ar: "المشرف الأعلى الذي نفّذ النشر الطارئ لا يمكنه تأكيد الموافقة",
  },
  emergencyRequestChangesPh: {
    en: "Request changes (item stays live)…",
    ar: "طلب تعديلات (يبقى العنصر منشورًا)…",
  },
  emergencyPublishedOk: {
    en: "Published — post-publication review required.",
    ar: "نُشر — يلزم مراجعة بعد النشر.",
  },
  emergencyConfirmedOk: {
    en: "Post-publication review confirmed.",
    ar: "أُكّدت المراجعة بعد النشر.",
  },
  emergencyUnpublishedOk: { en: "Unpublished.", ar: "أُلغي النشر." },
  emergencyChangesOk: {
    en: "Change request posted.",
    ar: "أُرسل طلب التعديلات.",
  },

  commentsLoadFailed: {
    en: "Could not load comments.",
    ar: "تعذّر تحميل التعليقات.",
  },
  commentsPostFailed: {
    en: "Could not post comment.",
    ar: "تعذّر نشر التعليق.",
  },
  commentsPosted: { en: "Comment posted.", ar: "نُشر التعليق." },
  commentsUnknownAuthor: { en: "Unknown", ar: "غير معروف" },

  revisionsLoadFailed: {
    en: "Could not load revisions.",
    ar: "تعذّر تحميل المراجعات.",
  },
  revisionsRestored: {
    en: "Revision restored onto the editable draft.",
    ar: "استُعيدت المراجعة إلى المسودة القابلة للتحرير.",
  },
  revisionsCompare: { en: "Compare #{n}", ar: "مقارنة #{n}" },
  revisionsUnknownAuthor: { en: "unknown", ar: "غير معروف" },

  previewOpen: { en: "Open public preview", ar: "فتح المعاينة العامة" },
  previewCreating: { en: "Creating preview…", ar: "جارٍ إنشاء المعاينة…" },
  previewOpening: { en: "Opening preview…", ar: "جارٍ فتح المعاينة…" },
  previewFailed: { en: "Preview failed", ar: "فشلت المعاينة" },
  previewHint: {
    en: "Opens a full candidate preview in the CMS (image, title, body). From there you can also open the public site if it is running.",
    ar: "تفتح معاينة كاملة للمرشح داخل نظام الإدارة (الصورة والعنوان والنص). ومن هناك يمكنكم فتح الموقع العام إن كان يعمل.",
  },

  seoMetaTitleAr: { en: "Share title (Arabic)", ar: "عنوان المشاركة (عربي)" },
  seoMetaTitleEn: { en: "Share title (English)", ar: "عنوان المشاركة (إنجليزي)" },
  seoMetaDescAr: {
    en: "Share description (Arabic)",
    ar: "وصف المشاركة (عربي)",
  },
  seoMetaDescEn: {
    en: "Share description (English)",
    ar: "وصف المشاركة (إنجليزي)",
  },
  seoBrowse: { en: "Browse…", ar: "استعراض…" },
  seoListImagesFailed: {
    en: "Could not list images.",
    ar: "تعذّر عرض الصور.",
  },
  seoBrowseHint: {
    en: "Browse shows images from this content’s media folder that you can access.",
    ar: "يعرض الاستعراض صور مجلد وسائط هذا المحتوى التي يمكنكم الوصول إليها.",
  },
  seoPathHint: {
    en: "Choose an image from the library, or leave empty to use the default.",
    ar: "اختاروا صورة من المكتبة، أو اتركوا الحقل فارغًا لاستخدام الافتراضي.",
  },
  seoNoImages: {
    en: "No images in this folder yet. Upload via the related image field first.",
    ar: "لا صور في هذا المجلد بعد. ارفعوا صورة عبر حقل الصورة المرتبط أولًا.",
  },

  loginEmail: { en: "Email address", ar: "البريد الإلكتروني" },
  loginPassword: { en: "Password", ar: "كلمة المرور" },
  loginEmailPh: { en: "Enter your email", ar: "أدخلوا بريدكم الإلكتروني" },
  loginPasswordPh: { en: "Enter your password", ar: "أدخلوا كلمة المرور" },
  loginSignIn: { en: "Sign in", ar: "تسجيل الدخول" },
  loginSigningIn: { en: "Signing in…", ar: "جارٍ تسجيل الدخول…" },
  loginFailed: { en: "Login failed", ar: "فشل تسجيل الدخول" },
  loginInvalidCredentials: {
    en: "Incorrect email or password.",
    ar: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  },
  loginNetworkError: { en: "Network error", ar: "خطأ في الشبكة" },
  loginSubtitle: { en: "Content management", ar: "إدارة المحتوى" },
  loginWelcome: {
    en: "Welcome back. Use your institutional email.",
    ar: "مرحبًا بعودتكم. استخدموا بريدكم المؤسسي.",
  },
  loginFooter: {
    en: "No email is sent by this app. Contact your Super administrator for access.",
    ar: "لا يُرسل هذا التطبيق بريدًا إلكترونيًا. تواصلوا مع المشرف الأعلى للحصول على الوصول.",
  },
  loginTestBubbles: {
    en: "Test only — one-click sign-in",
    ar: "للاختبار فقط — تسجيل دخول بنقرة واحدة",
  },
  loginBubbleLegend: { en: "Colour key", ar: "دليل الألوان" },
  loginDevDockAria: {
    en: "Developer one-click sign-in accounts",
    ar: "حسابات تسجيل الدخول السريع للمطورين",
  },
  loginDevDockEmpty: {
    en: "No accounts resolved — need DB users plus bubble passwords in .env.local",
    ar: "لا حسابات — يلزم مستخدمو قاعدة البيانات وكلمات مرور الفقاعات في .env.local",
  },
  imagesOnlyFormats: { en: "JPEG / PNG / WebP", ar: "JPEG / PNG / WebP" },
  imagesPdfFormats: { en: "JPEG / PNG / WebP / PDF", ar: "JPEG / PNG / WebP / PDF" },
  max5mbPrefix: { en: "Max 5 MB ·", ar: "الحد الأقصى 5 ميغابايت ·" },
  uploadImageOrPdf: { en: "Upload image or PDF", ar: "رفع صورة أو ملف PDF" },
  fieldBucket: { en: "Bucket", ar: "المجلد" },
  editorBold: { en: "Bold", ar: "عريض" },
  editorItalic: { en: "Italic", ar: "مائل" },
  editorBulletList: { en: "Bullet list", ar: "قائمة نقطية" },
  editorNumberedList: { en: "Numbered list", ar: "قائمة مرقّمة" },
  editorLink: { en: "Link", ar: "رابط" },
  editorInsertLink: { en: "Insert link", ar: "إدراج رابط" },
  editorClear: { en: "Clear", ar: "مسح" },
  editorClearFormat: { en: "Clear formatting", ar: "مسح التنسيق" },
  editorVisual: { en: "Visual", ar: "مرئي" },
  editorBulletLabel: { en: "• List", ar: "• قائمة" },
  editorNumberLabel: { en: "1. List", ar: "1. قائمة" },
  imagePreview: { en: "Image preview", ar: "معاينة الصورة" },

  // Relative time
  relativeMinutes: { en: "{n}m", ar: "{n} د" },
  relativeHours: { en: "{n}h", ar: "{n} س" },
  relativeDays: { en: "{n}d", ar: "{n} ي" },

  langToggle: { en: "العربية", ar: "English" },
  signedInAs: { en: "Signed in as", ar: "مسجّل الدخول باسم" },
  dismiss: { en: "Dismiss", ar: "إغلاق" },
  breadcrumb: { en: "Breadcrumb", ar: "مسار التنقل" },

  // CMS Desk — shell search
  navSearch: { en: "Search pages…", ar: "ابحث عن الصفحات…" },
  navNoResults: { en: "No matching pages.", ar: "لا صفحات مطابقة." },

  // CMS Desk — dashboard overview stats
  statsOverview: { en: "Overview", ar: "نظرة عامة" },
  statsDrafts: { en: "Drafts", ar: "المسودات" },
  statsReview: { en: "Awaiting review", ar: "بانتظار المراجعة" },
  statsPublished: { en: "Published", ar: "المنشور" },
  statsEnglish: { en: "English pending", ar: "الإنجليزية معلّقة" },
  statsSubmittedTitle: { en: "Content by editor", ar: "المحتوى حسب المحرر" },
  statsSubmittedEmpty: { en: "No items yet", ar: "لا توجد عناصر بعد" },
  statsSubmittedCount: {
    en: "{count} item(s) submitted for review",
    ar: "{count} عنصرًا أُرسل للمراجعة",
  },
  statsEditorTotal: { en: "Total", ar: "المجموع" },
  statsEditorPublished: { en: "Published", ar: "المنشور" },

  // CMS Desk — first-run onboarding
  onboardingTitle: {
    en: "Welcome to CRSIC content management",
    ar: "مرحبًا بكم في نظام إدارة المحتوى",
  },
  onboardingSubtitle: {
    en: "Three simple steps to keep the public site up to date.",
    ar: "ثلاث خطوات بسيطة للحفاظ على الموقع العام محدّثًا.",
  },
  onboardingStep1: { en: "1 — Create an item in Arabic", ar: "1 — أنشئوا عنصرًا بالعربية" },
  onboardingStep2: { en: "2 — Submit it for review", ar: "2 — أرسلوه للمراجعة" },
  onboardingStep3: { en: "3 — Publish it to the public site", ar: "3 — انشروه على الموقع العام" },
  onboardingGotIt: { en: "Got it", ar: "فهمت" },
  onboardingShow: { en: "Show how it works", ar: "اعرضوا طريقة العمل" },

  // CMS Desk — teaching empty states
  emptyDraftsHint: {
    en: "Create your first draft to get started.",
    ar: "أنشئوا مسودتكم الأولى للبدء.",
  },
  emptyReviewHint: {
    en: "Submitted items will appear here for your decision.",
    ar: "ستظهر هنا العناصر المُرسلة لاتخاذ قراركم.",
  },
  emptyPublishedHint: {
    en: "Published items appear here.",
    ar: "ستظهر هنا العناصر المنشورة.",
  },
  emptyCtaCreate: { en: "Create an item", ar: "أنشئوا عنصرًا" },
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

const CONTENT_TYPE_KEYS: Record<string, string> = {
  news: "news",
  event: "events",
  publication: "publications",
  partner: "partners",
  law: "laws",
  platform: "platforms",
  alert: "alerts",
  research_group: "researchGroups",
  research_project: "researchProjects",
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

/** Human label for CMS content types. */
export function contentTypeLabel(type: string | null | undefined, lang: CmsLang): string {
  if (!type) return "";
  const key = CONTENT_TYPE_KEYS[type];
  return key ? t(key, lang) : type.replace(/_/g, " ");
}

const AUDIT_ACTION_KEYS: Record<string, string> = {
  "auth.login.success": "auditActionLoginOk",
  "auth.login.fail": "auditActionLoginFail",
  "auth.logout": "auditActionLogout",
  "user.create": "auditActionUserCreate",
  "user.activate": "auditActionUserActivate",
  "user.deactivate": "auditActionUserDeactivate",
  "user.reset_password": "auditActionUserResetPassword",
  "user.update_scopes": "auditActionUserUpdateAccess",
  "user.update_profile": "auditActionUserUpdateProfile",
  "user.delete": "auditActionUserDelete",
  "user.away_set": "auditActionUserAwaySet",
  "user.away_cleared": "auditActionUserAwayCleared",
  "org.create": "auditActionOrgCreate",
  "org.update": "auditActionOrgUpdate",
  "org.delete": "auditActionOrgDelete",
  "media.upload": "auditActionMediaUpload",
  "media.replace": "auditActionMediaReplace",
  "media.delete": "auditActionMediaDelete",
  "content.reassign": "auditActionContentReassign",
  "content.review_owner_proposed": "auditActionReviewOwnerProposed",
  "content.review_owner_set": "auditActionReviewOwnerSet",
  "content.review_owner_rejected": "auditActionReviewOwnerRejected",
  "content.escalated": "auditActionEscalated",
};

const AUDIT_VERB_KEYS: Record<string, string> = {
  create: "auditVerbCreate",
  submit: "auditVerbSubmit",
  approve: "auditVerbApprove",
  reject: "auditVerbReject",
  changes_requested: "auditVerbChangesRequested",
  publish: "auditVerbPublish",
  unpublish: "auditVerbUnpublish",
  preview: "auditVerbPreview",
  delete: "auditVerbDelete",
  start_revision: "auditVerbStartRevision",
  restore_revision: "auditVerbRestoreRevision",
  reopen_rejected: "auditVerbReopenRejected",
  emergency_publish: "auditVerbEmergencyPublish",
  post_review_ok: "auditVerbPostReviewOk",
  post_review_changes: "auditVerbPostReviewChanges",
  post_review_unpublish: "auditVerbPostReviewUnpublish",
};

/** Human label for audit_log.action codes. */
export function auditActionLabel(action: string, lang: CmsLang): string {
  const exact = AUDIT_ACTION_KEYS[action];
  if (exact) return t(exact, lang);

  const dot = action.lastIndexOf(".");
  if (dot > 0) {
    const type = action.slice(0, dot);
    const verb = action.slice(dot + 1);
    const verbKey = AUDIT_VERB_KEYS[verb];
    const typeLabel = contentTypeLabel(type, lang);
    if (verbKey && typeLabel) {
      return tf("auditActionTyped", lang, { type: typeLabel, verb: t(verbKey, lang) });
    }
  }
  return action.replace(/\./g, " · ");
}

/** Human label for audit_log.entity_type. */
export function auditEntityLabel(entityType: string | null | undefined, lang: CmsLang): string {
  if (!entityType) return "";
  if (entityType === "user") return t("auditEntityUser", lang);
  if (entityType === "media") return t("auditEntityMedia", lang);
  if (entityType === "org_unit") return t("auditEntityOrg", lang);
  return contentTypeLabel(entityType, lang) || entityType.replace(/_/g, " ");
}

/** Pick Arabic / English personal name by UI language; fall back to displayName. */
export function localizedDisplayName(
  person: {
    displayName?: string | null;
    nameAr?: string | null;
    nameEn?: string | null;
  },
  lang: CmsLang,
): string {
  const ar = person.nameAr?.trim() || "";
  const en = person.nameEn?.trim() || "";
  const fallback = person.displayName?.trim() || "";
  if (lang === "ar") return ar || fallback || en;
  return en || fallback || ar;
}

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

const NOTIF_TITLE_KEYS: Record<string, string> = {
  "Changes requested on news": "notifTitleChangesNews",
  "News approved": "notifTitleNewsApproved",
  "News rejected": "notifTitleNewsRejected",
  "News published": "notifTitleNewsPublished",
  "News unpublished": "notifTitleNewsUnpublished",
  "Changes requested on event": "notifTitleChangesEvent",
  "Event approved": "notifTitleEventApproved",
  "Event rejected": "notifTitleEventRejected",
  "Event published": "notifTitleEventPublished",
  "Event unpublished": "notifTitleEventUnpublished",
  "Changes requested on publication": "notifTitleChangesPub",
  "Publication approved": "notifTitlePubApproved",
  "Publication rejected": "notifTitlePubRejected",
  "Publication published": "notifTitlePubPublished",
  "Publication unpublished": "notifTitlePubUnpublished",
  "Changes requested on partner": "notifTitleChangesPartner",
  "Partner approved": "notifTitlePartnerApproved",
  "Partner rejected": "notifTitlePartnerRejected",
  "Partner published": "notifTitlePartnerPublished",
  "Partner unpublished": "notifTitlePartnerUnpublished",
  "Changes requested on alert": "notifTitleChangesAlert",
  "Alert approved": "notifTitleAlertApproved",
  "Alert rejected": "notifTitleAlertRejected",
  "Alert published": "notifTitleAlertPublished",
  "Alert unpublished": "notifTitleAlertUnpublished",
  "Changes requested on research group": "notifTitleChangesGroup",
  "Research group approved": "notifTitleGroupApproved",
  "Research group rejected": "notifTitleGroupRejected",
  "Research group published": "notifTitleGroupPublished",
  "Research group unpublished": "notifTitleGroupUnpublished",
  "Changes requested on research project": "notifTitleChangesProject",
  "Research project approved": "notifTitleProjectApproved",
  "Research project rejected": "notifTitleProjectRejected",
  "Research project published": "notifTitleProjectPublished",
  "Research project unpublished": "notifTitleProjectUnpublished",
  "New comment on content": "notifTitleNewComment",
  "New comment on your content": "notifTitleNewCommentYours",
  "Item assigned to you": "notifTitleAssigned",
  "Review owner proposal needs confirmation": "notifTitleReviewOwnerProposal",
  "You are the review owner": "notifTitleYouAreReviewOwner",
  "Content escalated": "notifTitleEscalated",
  "Reviewer Away (OOO)": "notifTitleAway",
  "Emergency publish — post-review required": "notifTitleEmergencyPublish",
  "Post-publication review confirmed": "notifTitlePostReviewConfirmed",
  "Post-review: changes requested": "notifTitlePostReviewChanges",
  "Emergency item unpublished": "notifTitleEmergencyUnpublished",
};

/** Display label for stored notification titles (EN in DB → UI language). */
export function notificationTitleLabel(title: string, lang: CmsLang): string {
  const key = NOTIF_TITLE_KEYS[title];
  return key ? t(key, lang) : title;
}

/** Short action label derived from notification type (`news.published` → Published). */
export function notificationTypeLabel(type: string, lang: CmsLang): string {
  const action = type.split(".").pop() ?? type;
  if (action === "changes_requested") return t("notifActionChanges", lang);
  if (action === "approved") return t("notifActionApproved", lang);
  if (action === "rejected") return t("notifActionRejected", lang);
  if (action === "published") return t("notifActionPublished", lang);
  if (action === "unpublished") return t("notifActionUnpublished", lang);
  if (action === "comment") return t("notifActionComment", lang);
  if (action === "reassigned") return t("notifActionReassigned", lang);
  if (action === "escalated" || action.includes("escalat")) return t("notifActionEscalated", lang);
  if (action === "away_set") return t("notifActionAway", lang);
  if (action.includes("review_owner")) return t("notifActionReviewOwner", lang);
  if (action.includes("emergency") || action.includes("post_review") || action.includes("post-review")) {
    return t("notifActionEmergency", lang);
  }
  return action.replace(/_/g, " ");
}
