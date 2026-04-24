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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[36px] shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200">
        <h3 className="text-xl font-black text-white mb-2 tracking-tight">修改名稱</h3>
        <p className="text-zinc-500 text-[10px] mb-6 font-bold uppercase tracking-wider">修正打錯的動畫名稱</p>
        <input
          type="text"
          value={renameValue}
          onChange={(e) => onValueChange(e.target.value)}
          className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 transition-all mb-8"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-2xl text-zinc-400 font-bold text-sm"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!renameValue.trim() || refreshing}
            className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-2xl text-white font-black text-sm shadow-xl shadow-blue-900/20 disabled:opacity-50"
          >
            {refreshing ? '中...' : '確認修改'}
          </button>
        </div>
      </div>
    </div>
  );
}
