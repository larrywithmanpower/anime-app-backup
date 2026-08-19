'use client';

import React, { useState } from 'react';
import { AnimeItem, WatchStatus } from '@/types/anime';
import { resolveWatchUrl } from '@/lib/watchUrl';

interface AnimeCardProps {
  item: AnimeItem;
  onIncrement: (item: AnimeItem) => void;
  onDecrement: (item: AnimeItem) => void;
  onInputChange: (item: AnimeItem, value: string) => void;
  onInputBlur: (item: AnimeItem) => void;
  onEdit: (item: AnimeItem) => void;
  onSetStatus: (item: AnimeItem, status: WatchStatus) => void;
  /**
   * 出了新一季、而清單裡還沒有那一季時，要幫使用者建立的名稱；空字串代表不提供入口。
   * 刻意傳字串而不是物件，物件每次 render 都是新的會讓外層的 memo 失效
   */
  newSeasonName: string;
  onAddSeason: (item: AnimeItem, name: string) => void;
}

const formatDate = (raw: string) => {
  if (!raw) return '—';
  const source = raw.includes('T') ? new Date(raw) : new Date(raw.replace(/\//g, '-'));
  if (Number.isNaN(source.getTime())) return raw.replace(/\//g, '.');
  return `${String(source.getMonth() + 1).padStart(2, '0')}.${String(source.getDate()).padStart(2, '0')}`;
};

/**
 * 下一集提示文字；已經過期的排程回 null。
 *
 * 過期代表 GAS 的每日掃描還沒跑到（或這部已完結），此時寫「9/1 更新」會是假訊息，寧可不顯示。
 */
const describeNextEpisode = (airdate: string): string | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(airdate)) return null;

  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
  if (airdate < today) return null;
  if (airdate === today) return '今天更新';

  return `${airdate.slice(5).replace('-', '.')} 更新`;
};

const AnimeCard = React.memo(function AnimeCard({
  item,
  onIncrement,
  onDecrement,
  onInputChange,
  onInputBlur,
  onEdit,
  onSetStatus,
  newSeasonName,
  onAddSeason,
}: AnimeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);

  const current = parseInt(item.progress, 10);
  const total = parseInt(item.totalEpisodes, 10);
  const hasTotal = !Number.isNaN(total) && total > 0;
  // 已完結就不再提供加減集數，避免卡片同時說「已完結」又擺著 ＋ 誘人再按
  const isNumeric = /^\d+$/.test(item.progress) && item.status !== 'done';
  const percent = hasTotal && !Number.isNaN(current) ? Math.min(100, (current / total) * 100) : 0;
  const caughtUp = hasTotal && !Number.isNaN(current) && current >= total;

  const watchTarget = resolveWatchUrl(item.watchUrl, item.progress);
  const showCover = item.coverImage && !coverFailed;
  // 完結與棄追的作品不需要更新提示
  const nextEpisode =
    item.status === 'watching' || item.status === 'plan'
      ? describeNextEpisode(item.nextEpisodeDate)
      : null;
  // 完結的作品，那兩欄裝的是 GAS 查到的新季提示，不是下一集
  const newSeason = item.status === 'done' ? item.nextEpisodeLabel : '';

  // 「追完了沒」要看本季總集數（含還沒播的），不是進度條分母的已播集數——
  // 追平已播只代表追上最新一集（史萊姆 90/90，但這季排到 96，還有 6 集要播）。
  // 沒有本季總集數（沒綁 TVmaze、手動建立的）才退回「追平且沒有下一集」
  const seasonTotal = parseInt(item.seasonEpisodes, 10);
  const finished =
    !Number.isNaN(seasonTotal) && seasonTotal > 0
      ? !Number.isNaN(current) && current >= seasonTotal
      : caughtUp && !nextEpisode;

  return (
    <div className="fade-up group flex gap-3 rounded-xl border border-line bg-surface p-3 transition-colors hover:border-line-hi hover:bg-surface-hi">
      {/* 封面：Bangumi 沒圖或載入失敗時退成首字，維持版面對齊。
          高度跟著右側內容撐滿——加了進度條那一行之後，固定高會在封面下方留一塊空白 */}
      <div className="min-h-[80px] w-[60px] shrink-0 self-stretch overflow-hidden rounded-md border border-line bg-bg">
        {showCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.coverImage}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={() => setCoverFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[18px] font-semibold text-faint">
            {item.name.slice(0, 1)}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="flex items-start gap-2">
          <h3
            onClick={() => setExpanded(v => !v)}
            title={item.name}
            className={`min-w-0 flex-1 cursor-pointer text-[15px] font-semibold leading-snug text-text ${
              expanded ? 'break-words' : 'line-clamp-2'
            }`}
          >
            {item.name}
          </h3>
          {item.category && (
            <span className="shrink-0 self-center rounded border border-line px-1.5 py-0.5 text-[10px] leading-none text-faint">
              {item.category}
            </span>
          )}

          {/* 放右上角，與右下角的 ＋ 拉開成對角線，避免加集數時誤觸 */}
          <button
            onClick={() => onEdit(item)}
            className="-mr-1 -mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-faint transition-colors hover:bg-line hover:text-text active:scale-90"
            aria-label="編輯"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
        </div>

        {/* 進度條：沒填總集數就只顯示目前集數，不畫空條誤導 */}
        <div className="flex items-center gap-2">
          {item.status === 'done' ? (
            // 已完結就別再顯示「第 0 集」或「未設定」，看完了就是看完了
            <>
              <span className="shrink-0 text-[12px] text-success">
                已完結{hasTotal ? ` · 全 ${total} 集` : ''}
              </span>
              {/* 標成完結之後這部就從視線裡消失了，出新一季得有人講一聲。
                  那一季還沒進清單時做成按鈕：點了帶著綁好的排程去新增，不用自己重搜一次 */}
              {newSeason &&
                (newSeasonName ? (
                  <button
                    onClick={() => onAddSeason(item, newSeasonName)}
                    title={`加入「${newSeasonName}」到清單`}
                    className="flex min-w-0 items-center gap-1 rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-[10px] leading-none text-warn transition-colors hover:border-warn hover:bg-warn/20"
                  >
                    <span className="truncate">{newSeason}</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="h-2.5 w-2.5 shrink-0">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                ) : (
                  <span
                    title="這部後來又出了新的一季"
                    className="min-w-0 truncate rounded border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-[10px] leading-none text-warn"
                  >
                    {newSeason}
                  </span>
                ))}
            </>
          ) : hasTotal ? (
            <>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full transition-[width] duration-300 ${
                    caughtUp ? 'bg-success' : 'bg-accent'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <span className="tnum shrink-0 text-[11px] text-dim">
                {item.progress || 0} / {total}
              </span>
            </>
          ) : (
            // 文字進度（如「第二季 完」）給整行寬度，不擠在右側控制區裡被截斷
            <span className={`text-[12px] ${isNumeric ? 'tnum text-dim' : 'break-words text-dim'}`}>
              {isNumeric ? (
                <>
                  第 <span className="text-[13px] font-semibold text-text">{item.progress || 0}</span> 集
                </>
              ) : (
                item.progress || '未設定'
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="tnum shrink-0 text-[11px] text-faint">{formatDate(item.date)}</span>

          {nextEpisode && (
            <span
              title={item.nextEpisodeLabel ? `下一集：${item.nextEpisodeLabel}` : undefined}
              className="tnum shrink-0 rounded border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[10px] leading-none text-accent-hi"
            >
              {nextEpisode}
            </span>
          )}

          {watchTarget && (
            <a
              href={watchTarget}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-7 items-center gap-1 rounded-md border border-line px-2 text-[11px] text-dim transition-colors hover:border-accent hover:text-accent-hi"
              title={watchTarget}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5">
                <path d="M6 4l14 8-14 8z" />
              </svg>
              看
            </a>
          )}

          <div className="ml-auto flex items-center gap-1">
            {isNumeric && (
              <button
                onClick={() => onDecrement(item)}
                className="flex h-9 w-8 items-center justify-center rounded-md text-dim transition-colors hover:bg-line hover:text-text active:scale-95"
                aria-label="減少一集"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-3.5 w-3.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}

            {/* 文字進度已在上方整行顯示，這裡只給數字型的快速輸入框 */}
            {isNumeric && (
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={item.progress}
                onChange={e => onInputChange(item, e.target.value)}
                onBlur={() => onInputBlur(item)}
                onKeyDown={e => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                className="tnum h-9 w-11 rounded-md border border-transparent bg-transparent text-center text-[15px] font-semibold text-text transition-colors focus:border-line-hi focus:bg-bg focus:outline-none"
                aria-label="目前進度"
              />
            )}

            {isNumeric && (
              <button
                onClick={() => onIncrement(item)}
                disabled={caughtUp}
                title={caughtUp ? '已經追到最新一集了' : undefined}
                className="flex h-9 w-8 items-center justify-center rounded-md bg-accent-soft text-accent-hi transition-colors hover:bg-accent hover:text-white active:scale-95 disabled:pointer-events-none disabled:opacity-30"
                aria-label="增加一集"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-3.5 w-3.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* 真的追完整季才給一鍵收尾，省得再開編輯視窗 */}
        {finished && item.status === 'watching' && (
          <button
            onClick={() => onSetStatus(item, 'done')}
            className="self-start rounded-md border border-success/40 bg-success/10 px-2 py-1 text-[11px] text-success transition-colors hover:bg-success/20"
          >
            已追平 · 標為完結
          </button>
        )}
      </div>
    </div>
  );
});

export default AnimeCard;
