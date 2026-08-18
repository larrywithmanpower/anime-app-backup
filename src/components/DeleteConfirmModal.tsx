'use client';

import Modal from './Modal';
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
    <Modal
      title="刪除作品"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="h-10 flex-1 rounded-lg border border-line text-[14px] text-dim transition-colors hover:text-text"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(item)}
            disabled={refreshing}
            className="h-10 flex-1 rounded-lg bg-danger text-[14px] font-semibold text-white transition-colors hover:bg-danger/85 disabled:opacity-40"
          >
            {refreshing ? '刪除中…' : '刪除'}
          </button>
        </div>
      }
    >
      <p className="text-[14px] leading-relaxed text-dim">
        確定要刪除「<span className="font-semibold text-text">{item.name}</span>」嗎？
      </p>
      <p className="mt-2 text-[12px] text-faint">
        刪除後無法復原。如果只是看完了，改成「完結」狀態就好。
      </p>
    </Modal>
  );
}
