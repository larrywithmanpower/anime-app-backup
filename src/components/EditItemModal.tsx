'use client';

import { useState } from 'react';
import Modal, { fieldClass, labelClass } from './Modal';
import { AnimeItem, CATEGORIES, WATCH_STATUSES, WatchStatus } from '@/types/anime';
import { describeWatchUrl } from '@/lib/watchUrl';
import { searchBangumi, BangumiResult } from '@/lib/bangumi';
import type { ItemDraft } from '@/hooks/useAnimeList';

interface EditItemModalProps {
  item: AnimeItem;
  onSave: (item: AnimeItem, draft: ItemDraft) => Promise<boolean>;
  onDelete: (item: AnimeItem) => void;
  onClose: () => void;
}

export default function EditItemModal({ item, onSave, onDelete, onClose }: EditItemModalProps) {
  const [name, setName] = useState(item.name);
  const [progress, setProgress] = useState(item.progress);
  const [totalEpisodes, setTotalEpisodes] = useState(item.totalEpisodes);
  const [category, setCategory] = useState(item.category);
  const [status, setStatus] = useState<WatchStatus>(item.status);
  const [watchUrl, setWatchUrl] = useState(item.watchUrl);
  const [coverImage, setCoverImage] = useState(item.coverImage);
  const [bangumiId, setBangumiId] = useState(item.bangumiId);
  const [saving, setSaving] = useState(false);

  const [candidates, setCandidates] = useState<BangumiResult[] | null>(null);
  const [findingCover, setFindingCover] = useState(false);
  const [coverError, setCoverError] = useState('');

  // 用目前的名稱去 Bangumi 找封面；配錯的作品改個名字再找一次通常就對了
  const findCovers = async () => {
    if (!name.trim() || findingCover) return;
    setFindingCover(true);
    setCoverError('');
    try {
      const found = await searchBangumi(name);
      setCandidates(found);
      if (!found.length) setCoverError('找不到，可以把名稱改精確一點再試');
    } catch (err) {
      console.error(err);
      setCoverError('搜尋服務連不上');
    } finally {
      setFindingCover(false);
    }
  };

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    await onSave(item, {
      name,
      progress: progress.trim(),
      totalEpisodes: /^\d+$/.test(totalEpisodes.trim()) ? totalEpisodes.trim() : '',
      status,
      watchUrl: watchUrl.trim(),
      category,
      coverImage,
      bangumiId,
    });
    setSaving(false);
  };

  const urlHint = describeWatchUrl(watchUrl);

  return (
    <Modal
      title="編輯作品"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            onClick={() => onDelete(item)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-danger/30 text-danger transition-colors hover:bg-danger/10"
            aria-label="刪除這部作品"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <button
            onClick={submit}
            disabled={!name.trim() || saving}
            className="h-10 flex-1 rounded-lg bg-accent text-[14px] font-semibold text-white transition-colors hover:bg-accent-hi disabled:opacity-40"
          >
            {saving ? '儲存中…' : '儲存'}
          </button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <div>
          <label className={labelClass}>封面</label>
          <div className="flex gap-3">
            <div className="h-[74px] w-[52px] shrink-0 overflow-hidden rounded-md border border-line bg-bg">
              {coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={coverImage}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[18px] font-semibold text-faint">
                  {name.slice(0, 1)}
                </div>
              )}
            </div>

            <div className="flex flex-1 flex-col items-start gap-1.5">
              <button
                onClick={findCovers}
                disabled={findingCover}
                className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-dim transition-colors hover:border-line-hi hover:text-text disabled:opacity-40"
              >
                {findingCover ? '搜尋中…' : coverImage ? '換一張封面' : '找封面'}
              </button>
              {coverImage && (
                <button
                  onClick={() => {
                    setCoverImage('');
                    setBangumiId('');
                  }}
                  className="text-[12px] text-faint transition-colors hover:text-danger"
                >
                  移除封面
                </button>
              )}
              {coverError && <p className="text-[11px] text-warn">{coverError}</p>}
            </div>
          </div>

          {candidates && candidates.length > 0 && (
            <div className="scroll-thin mt-2.5 flex gap-2 overflow-x-auto pb-1">
              {candidates.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    setCoverImage(c.cover);
                    setBangumiId(String(c.id));
                  }}
                  title={`${c.nameCn || c.name}${c.date ? `（${c.date}）` : ''}`}
                  className={`w-[68px] shrink-0 overflow-hidden rounded-md border transition-colors ${
                    bangumiId === String(c.id) ? 'border-accent' : 'border-line hover:border-line-hi'
                  }`}
                >
                  <div className="h-[96px] w-full bg-bg">
                    {c.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.cover}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <p className="truncate px-1 pt-1 text-[9px] leading-tight text-dim">
                    {c.nameCn || c.name}
                  </p>
                  {/* 同名不同季只差在年份，這是最有效的辨識線索 */}
                  <p className="tnum truncate px-1 pb-1 text-[9px] leading-tight text-faint">
                    {c.date?.slice(0, 4) || '—'}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={labelClass}>作品名稱</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={fieldClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>目前進度</label>
            <input
              type="text"
              value={progress}
              onChange={e => setProgress(e.target.value)}
              className={`${fieldClass} tnum`}
            />
          </div>
          <div>
            <label className={labelClass}>總集數</label>
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
        <p className="-mt-1 text-[11px] leading-relaxed text-faint">
          進度改成純數字才會有 ＋／－ 按鈕；再填總集數就會出現進度條與「已追平」提示
        </p>

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
          <label className={labelClass}>觀看連結</label>
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
      </div>
    </Modal>
  );
}
