'use client';

interface RenameModalProps {
  renameValue: string;
  refreshing: boolean;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export default function RenameModal({
  renameValue,
  refreshing,
  onValueChange,
  onConfirm,
  onClose,
}: RenameModalProps) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-ink-black/95 p-6 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-xs rounded-[26px] border border-ink-border bg-ink-deep/95 p-7 backdrop-blur-2xl animate-in zoom-in-95 duration-200 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
        <div className="absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-star/55 to-transparent" />
        <h3 className="font-display mb-1.5 text-[18px] font-bold tracking-tight text-mist">
          修改名稱
        </h3>
        <p className="mb-6 text-[10px] uppercase tracking-[0.28em] text-mist-shadow">
          修正打錯的動畫名稱
        </p>
        <input
          type="text"
          value={renameValue}
          onChange={(e) => onValueChange(e.target.value)}
          className="mb-7 w-full rounded-xl border border-ink-border bg-ink-black/70 px-4 py-3 text-[14px] font-medium text-mist focus:border-star/60 focus:outline-none transition-all"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="font-display flex-1 rounded-xl border border-ink-border bg-ink-black/60 py-3 text-[11px] tracking-[0.3em] text-mist-silver transition-all active:scale-[0.97]"
          >
            取 消
          </button>
          <button
            onClick={onConfirm}
            disabled={!renameValue.trim() || refreshing}
            className="font-display flex-1 rounded-xl border border-star/40 bg-gradient-to-b from-star to-star-soft py-3 text-[11px] font-bold tracking-[0.3em] text-mist shadow-[0_12px_28px_-14px_var(--star-glow)] transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {refreshing ? '中' : '確 認 修 改'}
          </button>
        </div>
      </div>
    </div>
  );
}
