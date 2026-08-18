/**
 * Bangumi (bgm.tv) 搜尋封裝
 *
 * 選用理由：實測中文命中率遠高於 AniList（迷宮飯 / 鏈鋸人 / 凡人修仙傳在 AniList 皆搜不到），
 * 且同一支 API 同時涵蓋動畫、日韓歐美劇、漫畫。匿名即可呼叫，CORS 全開，不需要金鑰。
 *
 * 注意：API 要求帶 User-Agent，瀏覽器會自動帶自己的，不需要（也不能）手動設定。
 */

const SEARCH_URL = 'https://api.bgm.tv/v0/search/subjects?limit=10';

// 2=動畫 6=三次元（日劇/歐美劇/陸劇…） 1=書籍（漫畫/小說）
const SUBJECT_TYPES = [2, 6, 1];

// Bangumi 的相關度排序會把廣播劇、畫集之類的周邊排在本篇前面，
// 這裡以「動畫 → 劇集 → 書籍」重新分層，同層維持原相關度
const TYPE_PRIORITY: Record<number, number> = { 2: 0, 6: 1, 1: 2 };

export interface BangumiResult {
  id: number;
  /** 原文名（多為日文或英文） */
  name: string;
  /** 中文名，可能為空 */
  nameCn: string;
  /** 總集數；0 代表未定（多為尚未開播的續作） */
  episodes: number;
  date: string;
  cover: string;
  /** 由 type + tags 推斷的類型，使用者可在新增時改掉 */
  category: string;
}

interface RawSubject {
  id: number;
  type: number;
  name?: string;
  name_cn?: string;
  eps?: number;
  date?: string;
  images?: { common?: string; medium?: string; grid?: string; large?: string };
  tags?: { name: string }[];
}

// tag 是簡體，依地區關鍵字推斷類型
const TAG_RULES: [string[], string][] = [
  [['日剧'], '日劇'],
  [['韩剧'], '韓劇'],
  [['美剧', '英剧', '欧美'], '歐美劇'],
  [['国产剧', '大陆', '中国大陆'], '陸劇'],
  [['台剧', '台湾'], '台劇'],
];

const guessCategory = (subject: RawSubject): string => {
  if (subject.type === 2) return '動畫';

  const tags = (subject.tags || []).map(t => t.name);
  for (const [keywords, category] of TAG_RULES) {
    if (tags.some(tag => keywords.some(k => tag.includes(k)))) return category;
  }

  if (subject.type === 1) return '漫畫';
  return '';
};

export async function searchBangumi(keyword: string, signal?: AbortSignal): Promise<BangumiResult[]> {
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword: trimmed, filter: { type: SUBJECT_TYPES } }),
    signal,
  });

  if (!res.ok) throw new Error(`Bangumi 搜尋失敗（${res.status}）`);

  const json = await res.json();
  const data: RawSubject[] = json?.data || [];

  const ordered = [...data].sort(
    (a, b) => (TYPE_PRIORITY[a.type] ?? 3) - (TYPE_PRIORITY[b.type] ?? 3)
  );

  return ordered.map(subject => ({
    id: subject.id,
    name: subject.name || '',
    nameCn: subject.name_cn || '',
    episodes: subject.eps || 0,
    date: subject.date || '',
    cover: subject.images?.common || subject.images?.medium || subject.images?.grid || '',
    category: guessCategory(subject),
  }));
}
