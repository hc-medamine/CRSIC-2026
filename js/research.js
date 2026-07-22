/**
 * Research page: groups from research-groups.json, projects from research-projects.json.
 * Org unit IDs map to research tab ids (r1–r4).
 */
import { getLang, t } from './i18n.js';
import { el, replaceChildren } from './utils.js';
import { getResearchGroups, getResearchProjectsForGroup } from './data.js';
import { navigateTo } from './router.js';

export const RESEARCH_TAB_ORG = {
  r1: 'dept_quran_fiqh',
  r2: 'dept_thought_dialogue',
  r3: 'dept_algeria_history',
  r4: 'dept_islamic_civ',
};

/**
 * @param {object} group
 * @param {'ar'|'en'} lang
 */
function groupName(group, lang) {
  if (lang === 'en' && group.name_en) return group.name_en;
  return group.name_ar || group.name_en || '';
}

/**
 * @param {object} group
 * @param {'ar'|'en'} lang
 */
function groupSummary(group, lang) {
  if (lang === 'en' && group.summary_en) return group.summary_en;
  return group.summary_ar || group.summary_en || '';
}

/**
 * @param {object} project
 * @param {'ar'|'en'} lang
 */
function projectTitle(project, lang) {
  if (lang === 'en' && project.title_en) return project.title_en;
  return project.title_ar || project.title_en || '';
}

/**
 * Render group cards (+ nested project links) into a tab panel host.
 * @param {string} tabId r1|r2|r3|r4
 */
export function renderResearchGroupsForTab(tabId) {
  const orgId = RESEARCH_TAB_ORG[tabId];
  const host = document.getElementById(`research-groups-${tabId}`);
  if (!host || !orgId) return;

  const lang = getLang();
  const groups = getResearchGroups().filter((g) => g.orgUnitId === orgId);

  if (groups.length === 0) {
    replaceChildren(host, [
      el('p', {
        className: 'research-groups-empty text-muted',
        text: t('research_groups_empty') || (lang === 'en' ? 'No research groups published yet.' : 'لا توجد فرق بحثية منشورة بعد.'),
      }),
    ]);
    return;
  }

  replaceChildren(
    host,
    groups.map((group) => {
      const projects = getResearchProjectsForGroup(group.id);
      const projectLinks =
        projects.length > 0
          ? el('ul', {
              className: 'research-project-list',
              children: projects.map((p) => {
                const slug = p.slug || p.id;
                return el('li', {
                  children: [
                    el('a', {
                      className: 'research-project-link',
                      attrs: {
                        href: `#research-project/${encodeURIComponent(slug)}`,
                      },
                      text: projectTitle(p, lang),
                      on: {
                        click: (e) => {
                          e.preventDefault();
                          navigateTo('detail', undefined, undefined, {
                            detailType: 'research-project',
                            detailSlug: slug,
                          });
                        },
                      },
                    }),
                  ],
                });
              }),
            })
          : null;

      return el('div', {
        className: 'team-card research-group-card',
        children: [
          el('div', {
            className: 'team-card-name',
            text: groupName(group, lang),
          }),
          groupSummary(group, lang)
            ? el('div', {
                className: 'team-card-desc',
                text: groupSummary(group, lang),
              })
            : null,
          projectLinks,
        ].filter(Boolean),
      });
    }),
  );
}

/** Render all research tab group hosts. */
export function renderResearchPage() {
  Object.keys(RESEARCH_TAB_ORG).forEach((tabId) => renderResearchGroupsForTab(tabId));
}
