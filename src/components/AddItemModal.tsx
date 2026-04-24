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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[32px] shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-black mb-2 text-white tracking-tight">新增動畫</h2>
        <p className="text-zinc-500 text-[10px] mb-6 font-bold uppercase tracking-wider">將在您的追蹤清單新增一列</p>
        <input
          type="text"
          placeholder="動畫名稱 (例如: 龍之家族)"
          value={newItemName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 transition-all mb-6"
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-xl text-zinc-400 font-bold text-xs"
          >
            取消
          </button>
          <button
            onClick={onAdd}
            disabled={!newItemName.trim() || refreshing}
            className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-xl text-white font-bold text-xs shadow-lg shadow-blue-900/20 disabled:opacity-50"
          >
            {refreshing ? '通訊中...' : '確認新增'}
          </button>
        </div>
      </div>
    </div>
  );
}
