'use client';

import { useState } from 'react';
import Modal, { fieldClass, labelClass } from './Modal';
import { AnimeItem, CATEGORIES, WATCH_STATUSES, WatchStatus } from '@/types/anime';
import { describeWatchUrl } from '@/lib/watchUrl';
import type { ItemDraft } from '@/hooks/useAnimeList';

interface EditItemModalProps {
  item: AnimeItem;
  onSave: (item: AnimeItem, draft: ItemDraft) => Promise<boolean>;
  onDelete: (item: AnimeItem) => void;
  onClose: () => void;
}

export default function EditItemModal({ item, onSave, onDelete, onClose }: EditItemModalProps) {
  const [name, setName] = useState(item.name);
  const [totalEpisodes, setTotalEpisodes] = useState(item.totalEpisodes);
  const [category, setCategory] = useState(item.category);
  const [status, setStatus] = useState<WatchStatus>(item.status);
  const [watchUrl, setWatchUrl] = useState(item.watchUrl);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    await onSave(item, {
      name,
      totalEpisodes: /^\d+$/.test(totalEpisodes.trim()) ? totalEpisodes.trim() : '',
      status,
      watchUrl: watchUrl.trim(),
      category,
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
          <label className={labelClass}>作品名稱</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className={fieldClass}
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
          <p className="mt-1 text-[11px] text-faint">填了才會顯示進度條與「已追平」提示</p>
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
