'use client';

import { useState, useEffect, useRef } from 'react';
import Modal, { fieldClass, labelClass } from './Modal';
import { CATEGORIES, WATCH_STATUSES, WatchStatus } from '@/types/anime';
import { searchBangumi, BangumiResult } from '@/lib/bangumi';
import { describeWatchUrl } from '@/lib/watchUrl';
import ScheduleBinder, { ScheduleBinding } from './ScheduleBinder';
import type { ItemDraft } from '@/hooks/useAnimeList';

interface AddItemModalProps {
  refreshing: boolean;
  onAdd: (draft: ItemDraft) => Promise<boolean>;
  onClose: () => void;
}

const SEARCH_DEBOUNCE_MS = 400;

export default function AddItemModal({ refreshing, onAdd, onClose }: AddItemModalProps) {
  const [step, setStep] = useState<'search' | 'form'>('search');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<BangumiResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [progress, setProgress] = useState('0');
  const [totalEpisodes, setTotalEpisodes] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<WatchStatus>('watching');
  const [watchUrl, setWatchUrl] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [bangumiId, setBangumiId] = useState('');
  const [schedule, setSchedule] = useState<ScheduleBinding>({
    tvmazeId: '',
    nextEpisodeDate: '',
    nextEpisodeLabel: '',
  });

  const abortRef = useRef<AbortController | null>(null);

  // 打字即搜；每次重打都取消上一次請求
  useEffect(() => {
    if (step !== 'search') return;

    const trimmed = keyword.trim();
    if (!trimmed) {
      setResults([]);
      setSearchError('');
      setSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setSearching(true);
      setSearchError('');
      try {
        const found = await searchBangumi(trimmed, controller.signal);
        setResults(found);
        // 換關鍵字後結果整批換掉，展開狀態不該留在新清單上
        setExpandedId(null);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        console.error(err);
        setResults([]);
        setSearchError('搜尋服務連不上，可以直接手動建立');
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [keyword, step]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const pickResult = (result: BangumiResult) => {
    // Bangumi 回的是簡體中文名，直接帶入讓使用者自己改成習慣的寫法
    setName(result.nameCn || result.name);
    setTotalEpisodes(result.episodes > 0 ? String(result.episodes) : '');
    setCategory(result.category);
    setCoverImage(result.cover);
    setBangumiId(String(result.id));
    // 換一部作品就不能沿用上一部的排程綁定
    setSchedule({ tvmazeId: '', nextEpisodeDate: '', nextEpisodeLabel: '' });
    setStep('form');
  };

  const startManual = () => {
    setName(keyword.trim());
    setTotalEpisodes('');
    setCategory('');
    setCoverImage('');
    setBangumiId('');
    setSchedule({ tvmazeId: '', nextEpisodeDate: '', nextEpisodeLabel: '' });
    setStep('form');
  };

  const submit = async () => {
    if (!name.trim() || refreshing) return;
    await onAdd({
      name,
      progress: progress.trim() || '0',
      totalEpisodes: /^\d+$/.test(totalEpisodes.trim()) ? totalEpisodes.trim() : '',
      status,
      watchUrl: watchUrl.trim(),
      coverImage,
      bangumiId,
      category,
      ...schedule,
    });
  };

  const urlHint = describeWatchUrl(watchUrl);

  if (step === 'search') {
    return (
      <Modal title="新增作品" onClose={onClose} wide>
        <input
          autoFocus
          type="text"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="輸入作品名稱，例如：迷宮飯、半澤直樹"
          className={fieldClass}
        />

        <p className="mt-2 text-[11px] text-faint">
          搜尋涵蓋動畫、日韓歐美劇、漫畫；搜不到也可以手動建立
        </p>

        <div className="mt-3 space-y-1.5">
          {searching && <p className="py-4 text-center text-[13px] text-faint">搜尋中…</p>}

          {!searching && searchError && (
            <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-[12px] text-warn">
              {searchError}
            </p>
          )}

          {!searching &&
            results.map(result => (
              <div
                key={result.id}
                className="rounded-lg border border-line bg-bg transition-colors hover:border-accent"
              >
                <button
                  onClick={() => pickResult(result)}
                  className="flex w-full gap-2.5 p-2 text-left"
                >
                  <div className="h-[58px] w-[42px] shrink-0 overflow-hidden rounded border border-line bg-surface">
                    {result.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={result.cover}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text">
                        {result.nameCn || result.name}
                      </p>
                      {/* 人數一起顯示：Bangumi 非動畫作品常只有十幾人評分，藏起來反而會讓人誤信 */}
                      {result.score > 0 && (
                        <span className="tnum shrink-0 text-[11px] text-warn">
                          ★ {result.score.toFixed(1)}
                          <span className="text-faint"> ({result.ratingCount})</span>
                        </span>
                      )}
                    </div>
                    {result.nameCn && result.name !== result.nameCn && (
                      <p className="truncate text-[11px] text-faint">{result.name}</p>
                    )}
                    <p className="tnum mt-1 text-[11px] text-dim">
                      {[
                        result.category,
                        result.episodes > 0 ? `${result.episodes} 集` : '集數未定',
                        result.date?.slice(0, 4),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </button>

                {/* 新條目常常還沒人寫簡介（如剛上架的韓劇），退而顯示標籤，總比整塊空白好 */}
                {!result.summary && result.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-2 pb-2">
                    {result.tags.map(tag => (
                      <span
                        key={tag}
                        className="rounded border border-line px-1.5 py-0.5 text-[10px] leading-none text-faint"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 簡介另開一顆按鈕，避免想看劇情卻誤選了作品 */}
                {result.summary && (
                  <button
                    onClick={() => setExpandedId(id => (id === result.id ? null : result.id))}
                    className="w-full px-2 pb-2 text-left"
                  >
                    <p
                      className={`text-[11px] leading-relaxed text-dim ${
                        expandedId === result.id ? '' : 'line-clamp-2'
                      }`}
                    >
                      {result.summary}
                    </p>
                    <span className="mt-0.5 inline-block text-[11px] text-accent-hi">
                      {expandedId === result.id ? '收合' : '看劇情'}
                    </span>
                  </button>
                )}
              </div>
            ))}

          {/* 搜不到時要講清楚為什麼，否則會被誤會成「這個站沒有韓劇」 */}
          {!searching && !searchError && keyword.trim() && results.length === 0 && (
            <p className="rounded-lg border border-line bg-bg px-3 py-2.5 text-[12px] leading-relaxed text-dim">
              找不到「{keyword.trim()}」。資料站需要精確的劇名，差一個字就會落空
              （例：荒<span className="text-warn">唐</span>戀愛 → 荒
              <span className="text-success">糖</span>戀愛）。
              試試少打幾個字、改用其他譯名或原文名，再不行就手動建立。
            </p>
          )}

          {!searching && keyword.trim() && (
            <button
              onClick={startManual}
              className="w-full rounded-lg border border-dashed border-line px-3 py-2.5 text-[13px] text-dim transition-colors hover:border-line-hi hover:text-text"
            >
              手動建立「{keyword.trim()}」
            </button>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="確認資料"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            onClick={() => setStep('search')}
            className="h-10 rounded-lg border border-line px-4 text-[14px] text-dim transition-colors hover:text-text"
          >
            返回
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || refreshing}
            className="h-10 flex-1 rounded-lg bg-accent text-[14px] font-semibold text-white transition-colors hover:bg-accent-hi disabled:opacity-40"
          >
            {refreshing ? '新增中…' : '加入清單'}
          </button>
        </div>
      }
    >
      <div className="space-y-3.5">
        {coverImage && (
          <div className="flex gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverImage}
              alt=""
              referrerPolicy="no-referrer"
              className="h-[74px] w-[52px] rounded-md border border-line object-cover"
            />
            <p className="self-center text-[11px] text-faint">封面已自動帶入</p>
          </div>
        )}

        <div>
          <label className={labelClass}>作品名稱</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={fieldClass}
          />
          <p className="mt-1 text-[11px] text-faint">資料來源是簡體站，可以改成你習慣的寫法</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>目前進度</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={progress}
              onChange={e => setProgress(e.target.value)}
              className={`${fieldClass} tnum`}
            />
          </div>
          <div>
            <label className={labelClass}>總集數（選填）</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={totalEpisodes}
              onChange={e => setTotalEpisodes(e.target.value)}
              placeholder="未定"
              className={`${fieldClass} tnum`}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>類型</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCategory(category === c ? '' : c)}
                className={`rounded-lg px-2.5 py-1.5 text-[12px] transition-colors ${
                  category === c
                    ? 'bg-accent text-white'
                    : 'border border-line text-dim hover:text-text'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>狀態</label>
          <div className="flex gap-1.5">
            {WATCH_STATUSES.map(s => (
              <button
                key={s.key}
                onClick={() => setStatus(s.key)}
                className={`flex-1 rounded-lg py-2 text-[12px] transition-colors ${
                  status === s.key
                    ? 'bg-accent text-white'
                    : 'border border-line text-dim hover:text-text'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>觀看連結（選填）</label>
          <input
            type="url"
            value={watchUrl}
            onChange={e => setWatchUrl(e.target.value)}
            placeholder="貼上 gimy 作品頁或任何觀看網址"
            className={fieldClass}
          />
          {urlHint.hint && (
            <p className={`mt-1 text-[11px] ${urlHint.valid ? 'text-success' : 'text-warn'}`}>
              {urlHint.hint}
            </p>
          )}
        </div>

        <ScheduleBinder
          name={name}
          value={schedule}
          onChange={setSchedule}
          onTotalEpisodes={setTotalEpisodes}
        />
      </div>
    </Modal>
  );
}
