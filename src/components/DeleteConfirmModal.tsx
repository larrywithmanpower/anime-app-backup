'use client';

import { AnimeItem } from '@/types/anime';

interface DeleteConfirmModalProps {
  item: AnimeItem;
  refreshing: boolean;
  onConfirm: (item: AnimeItem) => void;
  onClose: () => void;
}

export default function DeleteConfirmModal({
  item,
  refreshing,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-black/95 p-6 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-xs rounded-[28px] border border-ink-border bg-ink-deep/95 p-7 text-center backdrop-blur-2xl animate-in zoom-in-95 duration-200 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
        <div className="absolute inset-x-12 -top-px h-px bg-gradient-to-r from-transparent via-cinnabar/70 to-transparent" />

        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-cinnabar/30 bg-cinnabar/10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-cinnabar">
            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </div>
        <h3 className="font-display mb-2 text-[18px] font-bold text-mist">
          確認刪除
        </h3>
        <p className="mb-7 text-[12px] leading-relaxed text-mist-silver">
          將「
          <span className="font-display font-bold text-mist">{item.name}</span>
          」從清單永久移除？
        </p>
        <div className="space-y-2.5">
          <button
            onClick={() => onConfirm(item)}
            disabled={refreshing}
            className="font-display w-full rounded-2xl border border-cinnabar/45 bg-gradient-to-b from-cinnabar to-cinnabar/85 py-3.5 text-[12px] font-bold tracking-[0.3em] text-mist shadow-[0_16px_40px_-18px_rgba(192,74,82,0.55)] transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {refreshing ? '處 理 中' : '確 認 永 久 刪 除'}
          </button>
          <button
            onClick={onClose}
            className="font-display w-full rounded-2xl border border-ink-border bg-ink-black/60 py-3.5 text-[12px] tracking-[0.3em] text-mist-silver transition-all active:scale-[0.97]"
          >
            取 消
          </button>
        </div>
      </div>
    </div>
  );
}
