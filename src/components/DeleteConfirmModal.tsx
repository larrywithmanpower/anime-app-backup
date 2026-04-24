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
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[36px] shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-red-500">
            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          </svg>
        </div>
        <h3 className="text-xl font-black text-white mb-2">確認刪除？</h3>
        <p className="text-zinc-500 text-xs mb-8 leading-relaxed">
          確定要將 「<span className="text-zinc-300 font-bold">{item.name}</span>」 從清單中永久移除嗎？
        </p>
        <div className="space-y-3">
          <button
            onClick={() => onConfirm(item)}
            disabled={refreshing}
            className="w-full py-4 bg-red-600 hover:bg-red-500 active:scale-95 transition-all rounded-2xl text-white font-black text-sm shadow-xl shadow-red-900/20"
          >
            {refreshing ? '處理中...' : '確認永久刪除'}
          </button>
          <button
            onClick={onClose}
            className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-2xl text-zinc-400 font-bold text-sm"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
