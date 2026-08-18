'use client';

import React, { useEffect } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** 搜尋類視窗需要較高的內容區 */
  wide?: boolean;
}

/** 所有彈窗的共用外殼：遮罩、Esc 關閉、標題列 */
export default function Modal({ title, onClose, children, footer, wide }: ModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`fade-up flex max-h-[88vh] w-full flex-col rounded-t-2xl border border-line bg-surface sm:rounded-2xl ${
          wide ? 'sm:max-w-lg' : 'sm:max-w-sm'
        }`}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-semibold text-text">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors hover:bg-line hover:text-text"
            aria-label="關閉"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto px-4 py-4">{children}</div>

        {footer && (
          <div className="border-t border-line px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/** 表單欄位共用樣式 */
export const fieldClass =
  'h-10 w-full rounded-lg border border-line bg-bg px-3 text-[14px] text-text placeholder:text-faint focus:border-accent focus:outline-none';

export const labelClass = 'mb-1.5 block text-[12px] font-medium text-dim';
