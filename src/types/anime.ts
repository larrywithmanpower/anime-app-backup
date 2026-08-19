/** 追蹤狀態；對應 Sheet E 欄 */
export type WatchStatus = 'watching' | 'plan' | 'done' | 'dropped';

export const WATCH_STATUSES: { key: WatchStatus; label: string }[] = [
  { key: 'watching', label: '在追' },
  { key: 'plan', label: '待看' },
  { key: 'done', label: '完結' },
  { key: 'dropped', label: '棄追' },
];

/** 作品類型；僅作為卡片標記與辨識用，不參與篩選 */
export const CATEGORIES = ['動畫', '日劇', '韓劇', '歐美劇', '陸劇', '台劇', '漫畫', '電影', '其他'] as const;

export interface AnimeItem {
  rowNumber: number;
  date: string;
  name: string;
  progress: string;
  /** 總集數；空字串代表未知（連載中或沒填） */
  totalEpisodes: string;
  status: WatchStatus;
  watchUrl: string;
  coverImage: string;
  bangumiId: string;
  category: string;
  /** TVmaze 作品 ID；有綁定才會有播出排程 */
  tvmazeId: string;
  /** 下一集播出日 YYYY-MM-DD；由 GAS 每日掃描寫入，前端只讀 */
  nextEpisodeDate: string;
  /** 下一集顯示文字，例如「第 188 集（S8E12）」 */
  nextEpisodeLabel: string;
}

/** Sheet E 欄可能殘留舊 AI 功能的 TRUE/FALSE，一律回退為在追 */
export const parseStatus = (raw: unknown): WatchStatus => {
  const value = String(raw ?? '').trim();
  return WATCH_STATUSES.some(s => s.key === value) ? (value as WatchStatus) : 'watching';
};

/** Sheet D 欄可能殘留舊 AI 功能寫入的描述字串，只接受純數字 */
export const parseTotalEpisodes = (raw: unknown): string => {
  const value = String(raw ?? '').trim();
  return /^\d+$/.test(value) && value !== '0' ? value : '';
};
