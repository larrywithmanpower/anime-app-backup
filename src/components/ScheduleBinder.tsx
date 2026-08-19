'use client';

import { useState } from 'react';
import { labelClass } from './Modal';
import {
  searchTvmaze,
  searchTvmazeTitles,
  bareTitle,
  fetchShowSchedule,
  tvmazeShowUrl,
  TvmazeResult,
} from '@/lib/tvmaze';
import { fetchAltNames } from '@/lib/bangumi';

export interface ScheduleBinding {
  tvmazeId: string;
  nextEpisodeDate: string;
  nextEpisodeLabel: string;
}

interface ScheduleBinderProps {
  /** 拿來當搜尋關鍵字的作品名稱，同時決定總集數要算整部還是只算指定的那一季 */
  name: string;
  /** 中文搜不到時，拿來換英文關鍵字的來源；沒有就只能靠中文 */
  bangumiId: string;
  value: ScheduleBinding;
  onChange: (next: ScheduleBinding) => void;
  /** 綁定成功時回填總集數，讓使用者存檔前還能改 */
  onTotalEpisodes: (total: string) => void;
}

const EMPTY: ScheduleBinding = { tvmazeId: '', nextEpisodeDate: '', nextEpisodeLabel: '' };

const formatDate = (raw: string) => raw.replace(/-/g, '.').slice(5);

/**
 * TVmaze 播出排程綁定。
 *
 * 刻意不做自動配對：華語作品的命中率大約只有一半，且同名不同季很容易配錯，
 * 錯了會每天推錯的更新提醒，比沒有提醒更糟。沿用封面那套「列候選讓人選」。
 */
export default function ScheduleBinder({
  name,
  bangumiId,
  value,
  onChange,
  onTotalEpisodes,
}: ScheduleBinderProps) {
  const [candidates, setCandidates] = useState<TvmazeResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [binding, setBinding] = useState<number | null>(null);
  const [error, setError] = useState('');

  const search = async () => {
    if (!name.trim() || searching) return;
    setSearching(true);
    setError('');
    try {
      let found = await searchTvmaze(name);

      // TVmaze 的日番只收英文名，中文關鍵字一律 0 筆。這時去 Bangumi 撈原文名與別名，
      // 削掉「Season 2」「III」這類季別後綴再搜一次——使用者照打中文就好
      if (!found.length && bangumiId) {
        const alts = await fetchAltNames(bangumiId).catch(() => [] as string[]);
        if (alts.length) found = await searchTvmazeTitles(alts.map(bareTitle));
      }

      setCandidates(found);
      if (!found.length) setError('找不到排程資料，可以改用原文名或英文名再試一次');
    } catch (err) {
      console.error(err);
      setError('排程服務連不上');
    } finally {
      setSearching(false);
    }
  };

  const bind = async (show: TvmazeResult) => {
    setBinding(show.id);
    setError('');
    try {
      const { next, airedEpisodes } = await fetchShowSchedule(show.id, name);
      onChange({
        tvmazeId: String(show.id),
        nextEpisodeDate: next?.date || '',
        nextEpisodeLabel: next?.label || '',
      });
      if (airedEpisodes > 0) onTotalEpisodes(String(airedEpisodes));
      setCandidates(null);
      // 綁定成功但查無未來集數時要講清楚，否則會被當成綁定失敗
      if (!next) setError('已綁定，但這部目前沒有排定的下一集');
    } catch (err) {
      console.error(err);
      setError('取得播出日失敗，稍後再試');
    } finally {
      setBinding(null);
    }
  };

  return (
    <div>
      <label className={labelClass}>播出排程（選填）</label>

      {value.tvmazeId ? (
        <div className="rounded-lg border border-line bg-bg px-3 py-2.5">
          {value.nextEpisodeDate ? (
            <p className="text-[12px] text-text">
              下一集{' '}
              <span className="tnum font-semibold text-accent-hi">
                {formatDate(value.nextEpisodeDate)}
              </span>
              {value.nextEpisodeLabel && <span className="text-dim"> · {value.nextEpisodeLabel}</span>}
            </p>
          ) : (
            <p className="text-[12px] text-dim">已綁定，目前沒有排定的下一集</p>
          )}

          <div className="mt-1.5 flex items-center gap-3 text-[11px]">
            <a
              href={tvmazeShowUrl(value.tvmazeId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-faint transition-colors hover:text-accent-hi"
            >
              TVmaze #{value.tvmazeId}
            </a>
            <button onClick={search} disabled={searching} className="text-faint transition-colors hover:text-text disabled:opacity-40">
              {searching ? '搜尋中…' : '重新綁定'}
            </button>
            <button onClick={() => onChange(EMPTY)} className="text-faint transition-colors hover:text-danger">
              解除
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={search}
          disabled={searching || !name.trim()}
          className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-dim transition-colors hover:border-line-hi hover:text-text disabled:opacity-40"
        >
          {searching ? '搜尋中…' : '找播出排程'}
        </button>
      )}

      {error && <p className="mt-1.5 text-[11px] text-warn">{error}</p>}

      {candidates && candidates.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {candidates.map(show => (
            <button
              key={show.id}
              onClick={() => bind(show)}
              disabled={binding !== null}
              className="flex w-full gap-2.5 rounded-lg border border-line bg-bg p-2 text-left transition-colors hover:border-accent disabled:opacity-50"
            >
              <div className="h-[52px] w-[38px] shrink-0 overflow-hidden rounded border border-line bg-surface">
                {show.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={show.image}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1 self-center">
                <p className="truncate text-[13px] font-semibold text-text">{show.name}</p>
                {/* 同名不同季只差在首播年份與平台，這是最有效的辨識線索 */}
                <p className="tnum mt-0.5 truncate text-[11px] text-dim">
                  {[show.premiered?.slice(0, 4), show.channel, show.status === 'Running' ? '連載中' : show.status === 'Ended' ? '已完結' : '']
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              {binding === show.id && <span className="self-center text-[11px] text-faint">綁定中…</span>}
            </button>
          ))}
          <p className="text-[11px] leading-relaxed text-faint">
            排程資料由{' '}
            <a
              href="https://www.tvmaze.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-dim underline"
            >
              TVmaze
            </a>{' '}
            提供（CC BY-SA）。選錯季度會推到錯的更新日，認一下首播年份再選
          </p>
        </div>
      )}
    </div>
  );
}
