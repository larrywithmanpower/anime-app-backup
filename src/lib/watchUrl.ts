/**
 * 觀看連結解析
 *
 * gimy 網址存整串，渲染時才抽 ID + 用當前網域重組，
 * 這樣 gimy 換網域時只要改設定裡的一個值，所有連結自動跟著更新。
 * 非 gimy 網址寬鬆接受，直接原樣開啟（不帶集數）。
 */

const GIMY_DOMAIN_KEY = 'gimyDomain';
export const DEFAULT_GIMY_DOMAIN = 'https://gimy01.co';

const GIMY_VOD = /\/vod\/(\d+)\.html/;
const GIMY_EPS = /\/eps\/(\d+)-\d+-\d+\.html/;

export const getGimyDomain = (): string => {
  if (typeof window === 'undefined') return DEFAULT_GIMY_DOMAIN;
  return localStorage.getItem(GIMY_DOMAIN_KEY) || DEFAULT_GIMY_DOMAIN;
};

export const setGimyDomain = (domain: string) => {
  const cleaned = domain.trim().replace(/\/+$/, '');
  localStorage.setItem(GIMY_DOMAIN_KEY, cleaned || DEFAULT_GIMY_DOMAIN);
};

/** 從 gimy 主頁或播放頁網址抽出作品 ID；不是 gimy 就回 null */
export const extractGimyId = (url: string): string | null => {
  const value = (url || '').trim();
  if (!value) return null;
  const matched = value.match(GIMY_VOD) || value.match(GIMY_EPS);
  return matched ? matched[1] : null;
};

/**
 * 產生要開啟的網址。
 * gimy → 用當前網域組出「下一集」播放頁；其他 → 原樣回傳；空值 → null
 */
export const resolveWatchUrl = (watchUrl: string, progress: string): string | null => {
  const value = (watchUrl || '').trim();
  if (!value) return null;

  const gimyId = extractGimyId(value);
  if (!gimyId) return value;

  const current = parseInt(progress, 10);
  const nextEpisode = Number.isNaN(current) ? 1 : current + 1;
  return `${getGimyDomain()}/eps/${gimyId}-1-${nextEpisode}.html`;
};

/** 新增 / 編輯時給使用者的即時提示 */
export const describeWatchUrl = (url: string): { valid: boolean; hint: string } => {
  const value = (url || '').trim();
  if (!value) return { valid: true, hint: '' };

  const gimyId = extractGimyId(value);
  if (gimyId) return { valid: true, hint: `已識別 gimy ID：${gimyId}，會自動帶下一集` };

  if (/^https?:\/\//.test(value)) return { valid: true, hint: '將直接開啟此連結（不帶集數）' };

  return { valid: false, hint: '看起來不是網址，請以 http:// 或 https:// 開頭' };
};
