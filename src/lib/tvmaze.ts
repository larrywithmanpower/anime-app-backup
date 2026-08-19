/**
 * TVmaze 播出排程封裝
 *
 * 為什麼要另外接一支 API：Bangumi 的分集播出日**只有日本動畫有**。
 * 實測凡人修仙傳 30 話 0 個播出日、吞噬星空 0 集、蒼蘭訣 36 話 0 個播出日、韓劇分集直接 404，
 * 而這些剛好是清單裡的大宗。TVmaze 補的正是這幾個洞（凡人修仙傳排到 2027-02、蒼蘭訣 36/36 都有日期）。
 *
 * 免金鑰、CORS 全開、頻率限制為每 IP 每 10 秒至少 20 次。本專案只在「綁定排程」時打，
 * 平常清單顯示的下一集是 GAS 每天掃描後寫進 Sheet 的，不會在開 App 時打這支 API。
 *
 * 授權為 CC BY-SA，必須標示來源，因此綁定區塊保留連回 TVmaze 作品頁的連結。
 */

import { toSimplified } from './t2s';

const BASE = 'https://api.tvmaze.com';

export interface TvmazeResult {
  id: number;
  name: string;
  /** 播出狀態：Running / Ended / To Be Determined */
  status: string;
  /** 首播日 YYYY-MM-DD */
  premiered: string;
  image: string;
  /** 電視台或串流平台（愛奇藝、Bilibili…） */
  channel: string;
  /** TVmaze 作品頁；CC BY-SA 要求的標示來源 */
  url: string;
}

export interface NextEpisode {
  /** 播出日 YYYY-MM-DD */
  date: string;
  /** 顯示用集數，例如「第 188 集（S8E12）」 */
  label: string;
}

interface RawHit {
  show?: {
    id: number;
    name?: string;
    status?: string;
    premiered?: string;
    url?: string;
    image?: { medium?: string; original?: string };
    network?: { name?: string };
    webChannel?: { name?: string };
  };
}

interface RawEpisode {
  season?: number;
  number?: number;
  airdate?: string;
}

export const tvmazeShowUrl = (id: string | number) => `https://www.tvmaze.com/shows/${id}`;

async function fetchSearch(keyword: string, signal?: AbortSignal): Promise<RawHit[]> {
  const res = await fetch(`${BASE}/search/shows?q=${encodeURIComponent(keyword)}`, { signal });
  if (!res.ok) throw new Error(`TVmaze 搜尋失敗（${res.status}）`);
  return (await res.json()) || [];
}

/** 同時送出多組關鍵字，合併去重；全部失敗才算失敗 */
export async function searchTvmazeTitles(titles: string[], signal?: AbortSignal): Promise<TvmazeResult[]> {
  const queries = [...new Set(titles.map(t => t.trim()).filter(Boolean))];
  if (!queries.length) return [];

  const settled = await Promise.allSettled(queries.map(q => fetchSearch(q, signal)));
  const succeeded = settled.filter(s => s.status === 'fulfilled');

  if (!succeeded.length) {
    const first = settled[0];
    throw first.status === 'rejected' ? first.reason : new Error('TVmaze 搜尋失敗');
  }

  const seen = new Set<number>();
  const results: TvmazeResult[] = [];
  for (const s of succeeded) {
    for (const hit of (s as PromiseFulfilledResult<RawHit[]>).value) {
      const show = hit.show;
      if (!show || seen.has(show.id)) continue;
      seen.add(show.id);
      results.push({
        id: show.id,
        name: show.name || '',
        status: show.status || '',
        premiered: show.premiered || '',
        image: show.image?.medium || show.image?.original || '',
        channel: show.webChannel?.name || show.network?.name || '',
        url: show.url || tvmazeShowUrl(show.id),
      });
    }
  }

  return results;
}

export async function searchTvmaze(keyword: string, signal?: AbortSignal): Promise<TvmazeResult[]> {
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  // TVmaze 的華語作品一律以簡體收錄，繁體關鍵字幾乎全數落空，
  // 因此繁簡兩種都送（簡體結果排前面），與 Bangumi 那邊同一套做法
  const simplified = toSimplified(trimmed);
  return searchTvmazeTitles(simplified === trimmed ? [trimmed] : [simplified, trimmed], signal);
}

// TVmaze 收的是「整部作品」，季別後綴會讓它整組落空：
// 實測「Kaiju No. 8 Season 2」0 筆、「Kaiju No. 8」1 筆；「A Will Eternal III」0 筆、去掉 III 才中
const SEASON_TAIL = /\s+(season|staffel|part|cour)\s*\d+.*$/i;
const SEPARATOR_TAIL = /\s*[:：\-–—].*$/;
const ROMAN_TAIL = /\s+(i{1,3}|iv|vi{0,3}|ix|x)$/i;

/** 把「Solo Leveling Season 2 -Arise from the Shadow-」削成「Solo Leveling」 */
export function bareTitle(raw: string): string {
  return raw.trim().replace(SEASON_TAIL, '').replace(SEPARATOR_TAIL, '').replace(ROMAN_TAIL, '').trim();
}

/** 台北時區的今天（YYYY-MM-DD）；airdate 也是這個格式，可直接字串比大小 */
const todayInTaipei = () =>
  new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });

/**
 * 從完整分集清單挑出第一個還沒播的。
 *
 * 絕對集數直接取清單位置：TVmaze 回傳已依播出順序排好，且預設不含特別篇。
 * 這一步不能省——使用者追動畫記的是「第 188 集」，但 TVmaze 標的是 S8E12。
 */
export function pickNextEpisode(episodes: RawEpisode[], today = todayInTaipei()): NextEpisode | null {
  const index = episodes.findIndex(ep => (ep.airdate || '') >= today);
  if (index < 0) return null;

  const ep = episodes[index];
  const absolute = index + 1;
  const multiSeason = new Set(episodes.map(e => e.season)).size > 1;

  return {
    date: ep.airdate || '',
    label: multiSeason ? `第 ${absolute} 集（S${ep.season}E${ep.number}）` : `第 ${absolute} 集`,
  };
}

const CN_DIGITS = '零一二三四五六七八九';

/**
 * 從作品名稱裡讀出使用者追的是第幾季，讀不到回 0。
 * 只認「第X季」——這是清單裡實際的寫法（鑽石王牌 第四季、修羅武神 第二季）。
 */
export function parseSeasonFromName(name: string): number {
  const match = name.match(/第\s*([0-9]+|[一二三四五六七八九十]+)\s*季/);
  if (!match) return 0;

  const raw = match[1];
  if (/^[0-9]+$/.test(raw)) return Number(raw);

  // 十 / 十二 / 二十…，追番用不到更大的數
  if (raw === '十') return 10;
  if (raw.length === 2 && raw[0] === '十') return 10 + CN_DIGITS.indexOf(raw[1]);
  if (raw.length === 2 && raw[1] === '十') return CN_DIGITS.indexOf(raw[0]) * 10;
  if (raw.length === 3 && raw[1] === '十') return CN_DIGITS.indexOf(raw[0]) * 10 + CN_DIGITS.indexOf(raw[2]);
  return CN_DIGITS.indexOf(raw);
}

/**
 * 算出「目前為止已經播出幾集」，也就是最新集數。
 *
 * 刻意不用分集清單的長度：TVmaze 連已公布但還沒播的都收進去，
 * 拿那個當分母會憑空多出幾集（史萊姆這週才第 91 集，清單卻已經排到 96）。
 * 進度條要回答的是「我離最新一集還差幾集」，所以只數播出日在今天以前的。
 *
 * 名稱有寫季別（「鑽石王牌 第四季」）就只算那一季——使用者的進度是從該季第 1 集起算的，
 * 拿全系列 191 集去比會變成 1/191。季別在 TVmaze 對不上（完美世界是 S2021…S2026
 * 這種年份季）時退回整部，不硬猜。
 *
 * 這段邏輯與 apps-script-code.gs 的 countAiredEpisodes 必須一致。
 */
export function seasonPool(name: string, episodes: RawEpisode[]): RawEpisode[] {
  const season = parseSeasonFromName(name);
  const inSeason = season > 0 ? episodes.filter(ep => ep.season === season) : [];
  return inSeason.length > 0 ? inSeason : episodes;
}

export function countAiredEpisodes(
  name: string,
  episodes: RawEpisode[],
  today = todayInTaipei()
): number {
  return seasonPool(name, episodes).filter(ep => ep.airdate && ep.airdate <= today).length;
}

/**
 * 這一季總共要出幾集（含已公布但還沒播的）。
 *
 * 只用來判斷「追完了沒」，不拿來當進度條的分母——分母是已播集數，
 * 使用者要看的是「我離最新一集差幾集」。追平已播只代表追上最新一集，
 * 史萊姆 90/90 但這季排到 96，還沒完結。
 *
 * 注意這個數字會浮動：TVmaze 只收已公布的集數，之後加播就會變多。
 */
export function countSeasonEpisodes(name: string, episodes: RawEpisode[]): number {
  return seasonPool(name, episodes).length;
}

export interface ShowSchedule {
  next: NextEpisode | null;
  /** 到今天為止已播出的集數；0 代表查不到 */
  airedEpisodes: number;
  /** 這一季總共要出幾集（含未播）；0 代表查不到 */
  seasonEpisodes: number;
}

/** 取得指定作品的下一集與最新集數；全部播完（或無排程）時 next 為 null */
export async function fetchShowSchedule(
  showId: string | number,
  name: string,
  signal?: AbortSignal
): Promise<ShowSchedule> {
  // 用 embed 一次拿回作品與分集，省一趟往返；絕對集數需要完整清單，不能用 embed=nextepisode
  const res = await fetch(`${BASE}/shows/${showId}?embed=episodes`, { signal });
  if (!res.ok) throw new Error(`TVmaze 取得分集失敗（${res.status}）`);

  const json = await res.json();
  const episodes: RawEpisode[] = json?._embedded?.episodes || [];
  return {
    next: pickNextEpisode(episodes),
    airedEpisodes: countAiredEpisodes(name, episodes),
    seasonEpisodes: countSeasonEpisodes(name, episodes),
  };
}
