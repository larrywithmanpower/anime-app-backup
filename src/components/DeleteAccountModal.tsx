'use client';

interface DeleteAccountModalProps {
  currentAccount: string;
  refreshing: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteAccountModal({
  currentAccount,
  refreshing,
  onConfirm,
  onClose,
}: DeleteAccountModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-black/95 p-6 backdrop-blur-3xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-sm rounded-[32px] border border-cinnabar/30 bg-ink-deep/95 p-8 text-center backdrop-blur-2xl animate-in zoom-in-95 duration-200 shadow-[0_50px_90px_-45px_rgba(0,0,0,0.9)]">
        <div className="absolute inset-x-16 -top-px h-px bg-gradient-to-r from-transparent via-cinnabar/70 to-transparent" />

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-cinnabar/30 bg-cinnabar/10">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="moon-breath h-8 w-8 text-cinnabar">
            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </div>
        <h3 className="font-display mb-3 text-[22px] font-bold text-mist">
          註銷整個帳號
        </h3>
        <p className="mb-8 text-[12px] leading-relaxed text-mist-silver">
          將永久移除帳號「
          <span className="font-display font-bold text-cinnabar">{currentAccount}</span>
          」於 Google Sheets 的所有追蹤資料，
          <br />
          此動作
          <span className="font-display font-bold text-mist">無法復原</span>
          。
        </p>
        <div className="space-y-2.5">
          <button
            onClick={onConfirm}
            disabled={refreshing}
            className="font-display w-full rounded-2xl border border-cinnabar/50 bg-gradient-to-b from-cinnabar to-cinnabar/85 py-4 text-[12px] font-bold tracking-[0.32em] text-mist shadow-[0_18px_45px_-20px_rgba(192,74,82,0.6)] transition-all active:scale-[0.97] disabled:opacity-50"
          >
            {refreshing ? '正 在 永 久 刪 除' : '確 認 永 久 刪 除'}
          </button>
          <button
            onClick={onClose}
            className="font-display w-full rounded-2xl border border-ink-border bg-ink-black/60 py-4 text-[12px] tracking-[0.32em] text-mist-silver transition-all active:scale-[0.97]"
          >
            取 消
          </button>
        </div>
      </div>
    </div>
  );
}
