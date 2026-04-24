'use client';

import React from 'react';
import { AnimeItem } from '@/types/anime';

interface AnimeCardProps {
  item: AnimeItem;
  isExpanded: boolean;
  onToggleExpand: (rowNumber: number) => void;
  onIncrement: (item: AnimeItem) => void;
  onDecrement: (item: AnimeItem) => void;
  onInputChange: (item: AnimeItem, value: string) => void;
  onInputBlur: (item: AnimeItem) => void;
  onDelete: (item: AnimeItem) => void;
  onRename: (item: AnimeItem) => void;
}

const formatDate = (raw: string) => {
  if (!raw) return '未知';
  if (raw.includes('T')) {
    return new Date(raw).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');
  }
  return raw.replace(/\//g, '.');
};

const AnimeCard = React.memo(function AnimeCard({
  item,
  isExpanded,
  onToggleExpand,
  onIncrement,
  onDecrement,
  onInputChange,
  onInputBlur,
  onDelete,
  onRename,
}: AnimeCardProps) {
  const isNumericProgress = /^\d+$/.test(item.progress);

  return (
    <div className="star-rise group relative overflow-hidden rounded-[16px] border border-ink-border bg-ink-deep/65 backdrop-blur-xl transition-all duration-500 hover:-translate-y-0.5 hover:border-moon/40 hover:bg-ink-mist/80 hover:shadow-[0_20px_55px_-24px_var(--moon-glow)]">
      {/* 左側金色 indicator：預設微弱、hover 點亮 */}
      <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-gradient-to-b from-transparent via-moon/40 to-transparent transition-opacity duration-500 group-hover:via-moon/90" />

      {/* 頂部金光線：hover 浮現 */}
      <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-moon/60 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      <div className="relative p-4 pl-[18px]">
        <div className="flex items-start justify-between gap-3">
          <div className="relative min-w-0 flex-1 pr-8">
            <h3
              onClick={() => onToggleExpand(item.rowNumber)}
              className={`font-display mb-1.5 cursor-pointer select-none text-[16px] font-bold leading-[1.4] text-mist transition-opacity active:opacity-60 ${
                isExpanded ? 'break-words' : 'line-clamp-2'
              }`}
              title={item.name}
            >
              {item.name}
            </h3>

            <div className="font-mono flex items-center gap-1.5 text-[11px] tracking-[0.15em] text-mist-silver">
              <span className="inline-block h-1 w-1 rounded-full bg-moon" />
              {formatDate(item.date)}
            </div>

            <button
              onClick={() => onRename(item)}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-mist-silver transition-all hover:text-star active:scale-90"
              title="修改名稱"
              aria-label="修改名稱"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <div className="flex items-center rounded-xl border border-ink-border bg-ink-black/85 transition-colors group-hover:border-moon/35">
              {isNumericProgress && (
                <button
                  onClick={() => onDecrement(item)}
                  className="flex h-10 w-7 items-center justify-center text-mist-silver transition-all hover:text-mist active:scale-75"
                  aria-label="減少"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
              <div className="flex min-w-[38px] flex-col items-center px-0.5 py-0.5">
                <span className="text-[7px] font-medium uppercase leading-none tracking-[0.35em] text-moon-soft">
                  {isNumericProgress ? 'EP' : 'ST'}
                </span>
                <input
                  type="text"
                  value={item.progress}
                  onChange={(e) => onInputChange(item, e.target.value)}
                  onBlur={() => onInputBlur(item)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                  className={`${
                    isNumericProgress ? 'w-10' : 'min-w-[44px] max-w-[100px] px-0.5'
                  } font-mono mt-0.5 bg-transparent text-center text-[15px] font-bold tracking-tight text-moon transition-all focus:outline-none`}
                />
              </div>
              {isNumericProgress && (
                <button
                  onClick={() => onIncrement(item)}
                  className="flex h-10 w-7 items-center justify-center text-moon transition-all hover:text-moon-soft active:scale-75"
                  aria-label="增加"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              )}
            </div>

            <button
              onClick={() => onDelete(item)}
              className="p-1.5 text-mist-silver transition-all hover:text-cinnabar active:scale-90"
              title="刪除項次"
              aria-label="刪除"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default AnimeCard;
