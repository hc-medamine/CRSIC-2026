/** Page math for the Home Center News carousel (PRD 2026-08-21). */

export const HOME_NEWS_PAGE_SIZE = 6;

/**
 * @param {number} length
 * @returns {number}
 */
export function homeNewsPageCount(length) {
  const n = Math.max(0, Number(length) || 0);
  return Math.ceil(n / HOME_NEWS_PAGE_SIZE);
}

/**
 * @param {number} index
 * @param {number} pageCount
 * @returns {number}
 */
export function wrapNewsPageIndex(index, pageCount) {
  if (pageCount <= 0) return 0;
  return ((Number(index) % pageCount) + pageCount) % pageCount;
}

/**
 * @param {unknown[]} items
 * @param {number} pageIndex
 * @returns {unknown[]}
 */
export function homeNewsPageItems(items, pageIndex) {
  const list = Array.isArray(items) ? items : [];
  const pages = homeNewsPageCount(list.length);
  if (pages === 0) return [];
  const i = wrapNewsPageIndex(pageIndex, pages);
  const start = i * HOME_NEWS_PAGE_SIZE;
  return list.slice(start, start + HOME_NEWS_PAGE_SIZE);
}
