'use client';

interface AddItemModalProps {
  newItemName: string;
  refreshing: boolean;
  onNameChange: (value: string) => void;
  onAdd: () => void;
  onClose: () => void;
}

export default function AddItemModal({
  newItemName,
  refreshing,
  onNameChange,
  onAdd,
  onClose,
}: AddItemModalProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-black/90 p-6 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-xs rounded-[26px] border border-ink-border bg-ink-deep/95 p-7 backdrop-blur-2xl animate-in zoom-in-95 duration-200 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
        <div className="absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-moon/55 to-transparent" />
        <h2 className="font-display mb-1.5 text-[18px] font-bold tracking-tight text-mist">
          新增動畫
        </h2>
        <p className="mb-6 text-[10px] uppercase tracking-[0.28em] text-mist-shadow">
          將在您的追蹤清單新增一列
        </p>
        <input
          type="text"
          placeholder="動畫名稱（例如：龍之家族）"
          value={newItemName}
          onChange={(e) => onNameChange(e.target.value)}
          className="mb-6 w-full rounded-xl border border-ink-border bg-ink-black/70 px-4 py-3 text-[14px] font-medium text-mist placeholder:text-mist-shadow focus:border-moon/60 focus:outline-none transition-all"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="font-display flex-1 rounded-xl border border-ink-border bg-ink-black/60 py-3 text-[11px] tracking-[0.3em] text-mist-silver transition-all active:scale-[0.97]"
          >
            取 消
          </button>
          <button
            onClick={onAdd}
            disabled={!newItemName.trim() || refreshing}
            className="font-display flex-1 rounded-xl border border-moon/40 bg-gradient-to-b from-moon to-moon-soft py-3 text-[11px] font-bold tracking-[0.3em] text-ink-black shadow-[0_12px_28px_-14px_var(--moon-glow)] transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {refreshing ? '通 訊 中' : '確 認'}
          </button>
        </div>
      </div>
    </div>
  );
}
