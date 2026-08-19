/**
 * 「已完結的作品又出了新一季」的推導。
 *
 * 資料來源是 GAS 每日掃描寫進 K / L 欄的新季提示（狀態為 done 時那兩欄裝的不是下一集）。
 * 這裡負責把提示轉成「可以直接加進清單的那一季」，讓卡片上的提示變成一個入口，
 * 不然使用者看到「第 4 季已開播」還是得自己回頭搜尋、綁定、輸入名稱。
 */

import { AnimeItem } from '@/types/anime';
import { parseSeasonFromName } from './tvmaze';

const CN_DIGITS = '零一二三四五六七八九';

/** 數字轉中文寫法；追番用不到 100 以上 */
const toChineseNumber = (n: number): string => {
  if (n < 10) return CN_DIGITS[n];
  if (n === 10) return '十';
  if (n < 20) return `十${CN_DIGITS[n - 10]}`;
  const ones = n % 10;
  return `${CN_DIGITS[Math.floor(n / 10)]}十${ones ? CN_DIGITS[ones] : ''}`;
};

// L 欄的新季提示格式固定是「第 4 季 · …」或「第 2～3 季 · …」，取最前面那一季
const LABEL_SEASON = /第\s*(\d+)/;
// 名稱裡的季別；與 parseSeasonFromName 同一套寫法，這裡另外需要原始字串來做替換
const NAME_SEASON = /第\s*([0-9]+|[一二三四五六七八九十]+)\s*季/;

export interface NewSeasonTarget {
  season: number;
  /** 沿用原名稱的寫法：「一念永恆 第三季」→「一念永恆 第四季」 */
  name: string;
  /**
   * 這一季是不是已經開播。
   * TVmaze 連「已宣布但還沒排播出日」的季別都收，那種加進來也沒東西可看，
   * 所以要能區分，讓加入時預設成「待看」而不是「在追」
   */
  started: boolean;
}

/**
 * 這部作品有沒有一季是「已經出了但清單裡還沒有」的。
 *
 * 一次只推最早的那一季：神墓第一季後面積了第二、三季，也應該從第二季開始追，
 * 加進去之後那一季自己完結時，會再由同一套邏輯提示第三季。
 */
export function newSeasonTarget(item: AnimeItem): NewSeasonTarget | null {
  if (item.status !== 'done' || !item.tvmazeId) return null;

  const season = Number(item.nextEpisodeLabel.match(LABEL_SEASON)?.[1] || 0);
  if (!season) return null;

  // 名稱裡的季別要對得上才敢改寫，否則會生出「XXX 第四季 第四季」這種東西
  const match = item.name.match(NAME_SEASON);
  if (!match || parseSeasonFromName(item.name) >= season) return null;

  const digitStyle = /^[0-9]+$/.test(match[1]);
  const replaced = match[0].replace(match[1], digitStyle ? String(season) : toChineseNumber(season));

  // K 欄裝的是新季最早的播出日；空的代表播出日未定，未來的日期代表還沒開播
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
  const started = !!item.nextEpisodeDate && item.nextEpisodeDate <= today;

  return { season, name: item.name.replace(match[0], replaced), started };
}
