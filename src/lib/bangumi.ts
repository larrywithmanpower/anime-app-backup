/**
 * Bangumi (bgm.tv) 搜尋封裝
 *
 * 選用理由：實測中文命中率遠高於 AniList（迷宮飯 / 鏈鋸人 / 凡人修仙傳在 AniList 皆搜不到），
 * 且同一支 API 同時涵蓋動畫、日韓歐美劇、漫畫。匿名即可呼叫，CORS 全開，不需要金鑰。
 *
 * 注意：API 要求帶 User-Agent，瀏覽器會自動帶自己的，不需要（也不能）手動設定。
 */

import { toSimplified } from './t2s';

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
  /** 劇情簡介，用來在新增時判斷要不要追；新條目常常還沒人寫，會是空字串 */
  summary: string;
  /** 熱門標籤。沒有簡介時拿來當判斷依據（新劇通常標籤有、簡介沒有） */
  tags: string[];
  /** 評分 0～10；0 代表沒人評過 */
  score: number;
  /** 評分人數。Bangumi 是 ACG 社群，非動畫作品常只有個位數，所以要連人數一起顯示 */
  ratingCount: number;
}

interface RawSubject {
  id: number;
  type: number;
  name?: string;
  name_cn?: string;
  eps?: number;
  date?: string;
  summary?: string;
  rating?: { score?: number; total?: number };
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

async function fetchSearch(keyword: string, signal?: AbortSignal): Promise<RawSubject[]> {
  const res = await fetch(SEARCH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keyword, filter: { type: SUBJECT_TYPES } }),
    signal,
  });

  if (!res.ok) throw new Error(`Bangumi 搜尋失敗（${res.status}）`);

  const json = await res.json();
  return json?.data || [];
}

export async function searchBangumi(keyword: string, signal?: AbortSignal): Promise<BangumiResult[]> {
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  // Bangumi 是簡體站，繁體關鍵字碰到鑽/钻、獨/独、靈/灵這類字形差異會完全搜不到，
  // 因此繁簡兩種都送（並行，不增加等待時間），簡體結果排前面
  const simplified = toSimplified(trimmed);
  const queries = simplified === trimmed ? [trimmed] : [simplified, trimmed];

  const settled = await Promise.allSettled(queries.map(q => fetchSearch(q, signal)));
  const succeeded = settled.filter(s => s.status === 'fulfilled');

  // 兩邊都失敗才算失敗（其中一邊掛掉不影響另一邊的結果）
  if (!succeeded.length) {
    const first = settled[0];
    throw first.status === 'rejected' ? first.reason : new Error('Bangumi 搜尋失敗');
  }

  const seen = new Set<number>();
  const data: RawSubject[] = [];
  for (const s of succeeded) {
    for (const subject of (s as PromiseFulfilledResult<RawSubject[]>).value) {
      if (seen.has(subject.id)) continue;
      seen.add(subject.id);
      data.push(subject);
    }
  }

  // 名稱吻合度優先於類型：只看類型的話，搜韓劇會被不相干的動畫插隊
  //（實例：搜「我的荒糖恋爱」，本篇被「我的老婆是只猫」「我的师父姜子牙」壓到第三）
  const matchRank = (subject: RawSubject): number => {
    const names = [subject.name_cn, subject.name].filter(Boolean) as string[];
    if (names.some(n => n === simplified || n === trimmed)) return 0;
    if (names.some(n => n.includes(simplified) || n.includes(trimmed))) return 1;
    return 2;
  };

  const ordered = [...data].sort((a, b) => {
    const byMatch = matchRank(a) - matchRank(b);
    if (byMatch !== 0) return byMatch;
    return (TYPE_PRIORITY[a.type] ?? 3) - (TYPE_PRIORITY[b.type] ?? 3);
  });

  return ordered.map(subject => ({
    id: subject.id,
    name: subject.name || '',
    nameCn: subject.name_cn || '',
    episodes: subject.eps || 0,
    date: subject.date || '',
    cover: subject.images?.common || subject.images?.medium || subject.images?.grid || '',
    category: guessCategory(subject),
    // 簡介是全形空白開頭的整段文字，去掉首尾空白才不會在卡片上留一塊空
    summary: (subject.summary || '').trim(),
    tags: (subject.tags || []).slice(0, 6).map(t => t.name),
    score: subject.rating?.score || 0,
    ratingCount: subject.rating?.total || 0,
  }));
}
