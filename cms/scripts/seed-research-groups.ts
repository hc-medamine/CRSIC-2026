/**
 * Seed the 8 locale research teams as published research_group items,
 * plus one sample research_project from legacy page_id=244 under quranic-miracles,
 * then rebuild data/research-groups.json and data/research-projects.json.
 *
 * Usage: npm run db:seed:research-groups
 */
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { Pool } from "pg";
import { randomUUID } from "node:crypto";

type Team = {
  orgUnitId: string;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  slug: string;
};

const TEAMS: Team[] = [
  {
    orgUnitId: "dept_quran_fiqh",
    slug: "quranic-miracles",
    titleAr: "فريق الإعجاز القرآني",
    titleEn: "Quranic Miracles Team",
    summaryAr:
      "يُعنى بالبحث في وجوه الإعجاز القرآني من جوانبه اللغوية والبيانية والعلمية والتشريعية.",
    summaryEn:
      "Researches linguistic, rhetorical, scientific and legislative aspects of Quranic inimitability.",
  },
  {
    orgUnitId: "dept_quran_fiqh",
    slug: "fiqh-studies",
    titleAr: "فريق الدراسات الفقهية",
    titleEn: "Jurisprudential Studies Team",
    summaryAr: "يتناول مسائل الفقه الإسلامي وأصوله ومناهج الاجتهاد وفقه النوازل.",
    summaryEn: "Covers Islamic jurisprudence, usul, ijtihad methods and contemporary fatwas.",
  },
  {
    orgUnitId: "dept_thought_dialogue",
    slug: "civilizations-dialogue",
    titleAr: "فريق حوار الحضارات",
    titleEn: "Dialogue of Civilizations Team",
    summaryAr: "يبحث في مناهج الحوار بين الحضارات والأديان والثقافات وقضايا التسامح.",
    summaryEn: "Studies inter-civilizational and interfaith dialogue and coexistence.",
  },
  {
    orgUnitId: "dept_thought_dialogue",
    slug: "creeds-schools",
    titleAr: "فريق العقائد والمذاهب",
    titleEn: "Creeds and Schools Team",
    summaryAr: "يدرس أصول العقيدة الإسلامية والمذاهب الفكرية والأمن الفكري.",
    summaryEn: "Studies Islamic creed, intellectual schools and intellectual security.",
  },
  {
    orgUnitId: "dept_algeria_history",
    slug: "cultural-heritage",
    titleAr: "فريق التراث الثقافي",
    titleEn: "Cultural Heritage Team",
    summaryAr: "يُعنى بالمخطوطات الجزائرية وفهرستها ورقمنتها والتراث الجنوبي.",
    summaryEn: "Manuscripts, cataloguing, digitisation and southern Algerian heritage.",
  },
  {
    orgUnitId: "dept_algeria_history",
    slug: "algerian-scholars",
    titleAr: "فريق الأعلام الجزائريين",
    titleEn: "Algerian Scholars Team",
    summaryAr: "يرصد ويوثق الشخصيات العلمية والثقافية الجزائرية عبر التاريخ.",
    summaryEn: "Documents Algerian scholarly and cultural figures through history.",
  },
  {
    orgUnitId: "dept_islamic_civ",
    slug: "civ-society",
    titleAr: "فريق الحضارة الإسلامية والمجتمع",
    titleEn: "Islamic Civilization and Society Team",
    summaryAr: "يدرس إسهامات الحضارة الإسلامية في بناء الوعي الإنساني.",
    summaryEn: "Studies Islamic civilization’s contribution to human consciousness.",
  },
  {
    orgUnitId: "dept_islamic_civ",
    slug: "islamic-economics",
    titleAr: "فريق الاقتصاد الإسلامي",
    titleEn: "Islamic Economics Team",
    summaryAr: "يبحث في أسس الاقتصاد الإسلامي والصيرفة الإسلامية والوقف.",
    summaryEn: "Islamic economics, banking and waqf foundations and applications.",
  },
];

function publicGroupsPath() {
  return join(process.cwd(), "..", "data", "research-groups.json");
}

function publicProjectsPath() {
  return join(process.cwd(), "..", "data", "research-projects.json");
}

function writePublicJson(path: string, items: unknown[]) {
  const dir = dirname(path);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (existsSync(path)) writeFileSync(`${path}.bak`, readFileSync(path));
  const tmp = `${path}.tmp`;
  writeFileSync(tmp, JSON.stringify({ items }, null, 4), "utf8");
  renameSync(tmp, path);
}

/** Sample project from https://www.crsic.dz/?page_id=244 (AR-first). */
const SAMPLE_PROJECT = {
  slug: "quran-sunnah-building-algerian-person",
  titleAr:
    'أثر القرآن والسنة في بناء الإنسان الجزائري من وحي الإعجاز إلى وعي الإنجاز',
  titleEn:
    "Impact of the Qur'an and Sunnah on building the Algerian person — from inimitability inspiration to achievement awareness",
  leadAr: "د.عبد القادر جعيد",
  leadEn: "Dr. Abdelkader Djaid",
  questionsAr: `<ul>
<li>ماهي الثوابت المنهجية في بناء الانسان؟ وهل هي نقلية أم عقلية؟</li>
<li>أين تكمن مواطن الخصوصية في بناء الانسان؟</li>
<li>كيف يمكن بناء الفرد والمجتمع ليكونا فاعلين في عملية الإعمار الإنساني؟</li>
<li>هل عملية الانفتاح على ثقافات الأمم وحضاراتها عامل نماء أم عامل هدم؟</li>
<li>ماهي الآليات العملية والواقعية التي يُقدمها المنهاج الرباني للعودة إلى المسار الصحيح في المشروع الحضاري؟</li>
</ul>`,
  dibajaAr: `يعاني المجتمع الجزائري كباقي المجتمعات الإسلامية تصدعا في البنية الداخلية على مستوى الفرد والمجتمع، شكلت عائقا في طريق البناء الحضاري المنشود مما يستدعي تكاتف الجهود لتشخيص مواطن الداء وصولا إلى مرحلة الإصلاح والعلاج. ولا شك أن نقطة البداية هو الإنسان ذاته الذي فقد معالم شخصيته الإسلامية. هذا الأمر دفع بفرقة البحث في الإعجاز أن تتبنى مشروعها الموسوم: أثر القرآن والسنة في بناء الإنسان الجزائري "من وحي الإعجاز إلى وعي الإنجاز" الذي ينطلق من إشكالية عدم انتفاع الانسان الجزائري من القرآن والسنة في بناء الشخصية المتميزة والفاعلة كما كان المسلمين الأوائل.`,
  axes: [
    { ar: "أثر القيم الإيمانية في بناء الفرد." },
    { ar: "أثر القيم الأخلاقية في بناء الفرد." },
    { ar: "وسائل بناء القيم في الفرد." },
  ],
  durationAr:
    "ثلاث سنوات؛ كل قسم يستغرق سنة ونصف؛ يتم إنجاز كل محور في أربعة أشهر، ويُختم بورشات عمل وندوات ودراسات ميدانية.",
  impacts: [
    {
      ar: "تشخيص دقيق لأزمة الفرد والمجتمع المسلم من خلال البحث في الرصيد الموروث والاستفادة من تجارب الأمم الأخرى.",
    },
    {
      ar: "تجاوز مراحل التشخيص إلى مرحلة اقتراح الحلول في عملية بناء الفرد والمجتمع والأمة بالعودة إلى المنهاج الرباني.",
    },
    {
      ar: "وضع استراتيجية واقعية ومرنة لمعالم الشخصية الإسلامية الفاعلة مع الاستفادة من مخرجات لا تتعارض مع ثوابت الدين.",
    },
    {
      ar: "تفعيل التكامل بين الأفراد والمجتمعات والدول الإسلامية لإحداث إقلاع حضاري وتنموي مستدام.",
    },
    {
      ar: "الانتقال من الأدوار التحسيسية والتشخيصية إلى قوة اقتراح للأفكار والمشاريع التنموية.",
    },
    {
      ar: "أثر ترسيخ منظومة القيم على فعالية المؤسسات الاقتصادية (الانضباط، الإتقان، الكفاءة).",
    },
  ],
};

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  let seedEmail = process.env.SEED_SUPER_ADMIN_EMAIL || "";
  try {
    const envText = readFileSync(join(process.cwd(), ".env.local"), "utf8");
    const m = envText.match(/^SEED_SUPER_ADMIN_EMAIL=(.+)$/m);
    if (m) seedEmail = m[1].trim().replace(/^["']|["']$/g, "");
  } catch {
    /* optional */
  }

  const pool = new Pool({ connectionString: url });
  try {
    const sa = await pool.query<{ id: string }>(
      seedEmail
        ? `SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE AND email = $1
           ORDER BY created_at ASC LIMIT 1`
        : `SELECT id FROM users WHERE role = 'super_admin' AND is_active = TRUE
           ORDER BY created_at ASC LIMIT 1`,
      seedEmail ? [seedEmail] : [],
    );
    const actorId = sa.rows[0]?.id;
    if (!actorId) {
      console.error("No super_admin user found to own seed groups.");
      process.exit(1);
    }

    for (const team of TEAMS) {
      const existing = await pool.query<{ id: string }>(
        `SELECT id FROM content_items
         WHERE content_type = 'research_group' AND public_slug = $1`,
        [team.slug],
      );
      if (existing.rows[0]) {
        console.log(`Skip existing group ${team.slug}`);
        continue;
      }

      const inserted = await pool.query<{ id: string }>(
        `INSERT INTO content_items (
           content_type, status, org_unit_id, created_by, updated_by, en_status,
           title_ar, title_en, summary_ar, summary_en,
           research_lead_ar, research_lead_en, research_members,
           public_slug, checklist_confirmed, published_at, live_at
         ) VALUES (
           'research_group', 'published', $1, $2, $2, 'ready',
           $3, $4, $5, $6,
           '', '', '[]'::jsonb,
           $7, TRUE, NOW(), NOW()
         ) RETURNING id`,
        [
          team.orgUnitId,
          actorId,
          team.titleAr,
          team.titleEn,
          team.summaryAr,
          team.summaryEn,
          team.slug,
        ],
      );
      const id = inserted.rows[0].id;
      const live = {
        id,
        slug: team.slug,
        orgUnitId: team.orgUnitId,
        name_ar: team.titleAr,
        name_en: team.titleEn,
        summary_ar: team.summaryAr,
        summary_en: team.summaryEn,
        lead_ar: "",
        lead_en: "",
        members: [],
      };
      await pool.query(`UPDATE content_items SET live_payload = $2::jsonb WHERE id = $1`, [
        id,
        JSON.stringify(live),
      ]);
      console.log(`Created ${team.slug} (${id})`);
    }

    const groupRows = await pool.query<{ live_payload: unknown }>(
      `SELECT live_payload FROM content_items
       WHERE content_type = 'research_group' AND live_payload IS NOT NULL
       ORDER BY live_at DESC NULLS LAST, created_at ASC`,
    );
    writePublicJson(
      publicGroupsPath(),
      groupRows.rows.map((r) => r.live_payload),
    );
    console.log(`Rebuilt research-groups.json (${groupRows.rows.length} items)`);

    const group = await pool.query<{ id: string; org_unit_id: string }>(
      `SELECT id, org_unit_id FROM content_items
       WHERE content_type = 'research_group' AND public_slug = 'quranic-miracles'
       LIMIT 1`,
    );
    const parent = group.rows[0];
    if (!parent) {
      console.warn("Skip sample project: group quranic-miracles not found");
    } else {
      const existingProject = await pool.query<{ id: string }>(
        `SELECT id FROM content_items
         WHERE content_type = 'research_project' AND public_slug = $1`,
        [SAMPLE_PROJECT.slug],
      );
      if (existingProject.rows[0]) {
        console.log(`Skip existing project ${SAMPLE_PROJECT.slug}`);
      } else {
        const id = randomUUID();
        const live = {
          id,
          slug: SAMPLE_PROJECT.slug,
          orgUnitId: parent.org_unit_id,
          groupId: parent.id,
          title_ar: SAMPLE_PROJECT.titleAr,
          title_en: SAMPLE_PROJECT.titleEn,
          lead_ar: SAMPLE_PROJECT.leadAr,
          lead_en: SAMPLE_PROJECT.leadEn,
          dibaja_ar: SAMPLE_PROJECT.dibajaAr,
          dibaja_en: "",
          questions_ar: SAMPLE_PROJECT.questionsAr,
          questions_en: "",
          axes: SAMPLE_PROJECT.axes,
          duration_ar: SAMPLE_PROJECT.durationAr,
          duration_en: "",
          impacts: SAMPLE_PROJECT.impacts,
        };
        await pool.query(
          `INSERT INTO content_items (
             id, content_type, status, org_unit_id, created_by, updated_by, en_status,
             title_ar, title_en, research_group_id, research_lead_ar, research_lead_en,
             body_ar, body_en, research_questions_ar, research_questions_en,
             research_axes, research_duration_ar, research_duration_en, research_impacts,
             public_slug, checklist_confirmed, published_at, live_at, live_payload
           ) VALUES (
             $1, 'research_project', 'published', $2, $3, $3, 'ready',
             $4, $5, $6, $7, $8,
             $9, NULL, $10, NULL,
             $11::jsonb, $12, NULL, $13::jsonb,
             $14, TRUE, NOW(), NOW(), $15::jsonb
           )`,
          [
            id,
            parent.org_unit_id,
            actorId,
            SAMPLE_PROJECT.titleAr,
            SAMPLE_PROJECT.titleEn,
            parent.id,
            SAMPLE_PROJECT.leadAr,
            SAMPLE_PROJECT.leadEn,
            SAMPLE_PROJECT.dibajaAr,
            SAMPLE_PROJECT.questionsAr,
            JSON.stringify(SAMPLE_PROJECT.axes),
            SAMPLE_PROJECT.durationAr,
            JSON.stringify(SAMPLE_PROJECT.impacts),
            SAMPLE_PROJECT.slug,
            JSON.stringify(live),
          ],
        );
        console.log(`Created sample project ${SAMPLE_PROJECT.slug} (${id})`);
      }
    }

    const projectRows = await pool.query<{ live_payload: unknown }>(
      `SELECT live_payload FROM content_items
       WHERE content_type = 'research_project' AND live_payload IS NOT NULL
       ORDER BY live_at DESC NULLS LAST, created_at ASC`,
    );
    writePublicJson(
      publicProjectsPath(),
      projectRows.rows.map((r) => r.live_payload),
    );
    console.log(`Rebuilt research-projects.json (${projectRows.rows.length} items)`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
