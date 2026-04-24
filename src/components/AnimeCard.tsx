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
  return (
    <div
      className="group relative overflow-hidden p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/40 backdrop-blur-sm transition-all hover:bg-zinc-900 hover:border-zinc-700/50 shadow-xl"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 group/name">
            <div
              onClick={() => onToggleExpand(item.rowNumber)}
              className={`text-[17px] font-black leading-tight text-white flex-1 flex items-center gap-2 cursor-pointer select-none active:opacity-70 transition-opacity ${isExpanded ? '' : 'min-w-0'}`}
              title={item.name}
            >
              <span className={isExpanded ? 'break-words' : 'line-clamp-2 md:line-clamp-none break-words'}>{item.name}</span>
            </div>
            <button
              onClick={() => onRename(item)}
              className="p-1 px-1.5 text-zinc-500 hover:text-blue-400 transition-all shrink-0 active:scale-90"
              title="修改名稱"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider bg-zinc-800/30 px-2 py-1 rounded-lg">
              <span className="w-1 h-1 rounded-full bg-blue-500/40"></span>
              {item.date ? (item.date.includes('T') ? new Date(item.date).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/') : item.date) : '未知'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-black/50 rounded-xl p-0.5 border border-zinc-800 group-hover:border-blue-500/20 transition-all">
            {/^\d+$/.test(item.progress) && (
              <button
                onClick={() => onDecrement(item)}
                className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white active:scale-75 transition-all"
                aria-label="減少"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            )}
            <div className="flex flex-col items-center px-1">
              <span className="text-[6px] font-black text-blue-500/50 uppercase tracking-[0.2em] mb-0">
                {/^\d+$/.test(item.progress) ? '集數' : '狀態'}
              </span>
              <input
                type="text"
                value={item.progress}
                onChange={(e) => onInputChange(item, e.target.value)}
                onBlur={() => onInputBlur(item)}
                onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                className={`${/^\d+$/.test(item.progress) ? 'w-8' : 'min-w-[40px] max-w-[105px] px-0.5'} bg-transparent text-blue-500 text-center font-black text-base focus:outline-none transition-all`}
              />
            </div>
            {/^\d+$/.test(item.progress) && (
              <button
                onClick={() => onIncrement(item)}
                className="w-8 h-8 flex items-center justify-center text-blue-500 hover:text-blue-400 active:scale-75 transition-all"
                aria-label="增加"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              </button>
            )}
          </div>

          <button
            onClick={() => onDelete(item)}
            className="p-2 text-red-500/40 hover:text-red-500 active:scale-90 transition-all"
            title="刪除項次"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
});

export default AnimeCard;
