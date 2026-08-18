'use client';

import type { Toast } from '@/hooks/useAnimeList';

interface ToastStackProps {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}

/** 取代原本的 alert()：不打斷操作，也不會靜默吞掉錯誤 */
export default function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {toasts.map(toast => (
        <button
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
          className={`toast-in pointer-events-auto max-w-sm rounded-lg border px-3.5 py-2.5 text-left text-[13px] shadow-lg backdrop-blur-md ${
            toast.tone === 'error'
              ? 'border-danger/40 bg-danger/15 text-danger'
              : 'border-line-hi bg-surface-hi/95 text-text'
          }`}
        >
          {toast.message}
        </button>
      ))}
    </div>
  );
}
