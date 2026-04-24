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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-red-500/20 p-8 rounded-[40px] shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 text-center">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-red-500 animate-pulse">
            <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            <path d="M10 11v6"></path>
            <path d="M14 11v6"></path>
          </svg>
        </div>
        <h3 className="text-2xl font-black text-white mb-3">刪除整個帳號？</h3>
        <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
          您確定要刪除帳號 「<span className="text-red-400 font-black">{currentAccount}</span>」 嗎？<br />
          這將會<span className="text-zinc-200 font-bold">永久移除</span> Google Sheets 中該分頁的所有動畫追蹤資料，此動作無法復原。
        </p>
        <div className="space-y-3">
          <button
            onClick={onConfirm}
            disabled={refreshing}
            className="w-full py-5 bg-red-600 hover:bg-red-500 active:scale-95 transition-all rounded-2xl text-white font-black text-sm shadow-2xl shadow-red-900/40"
          >
            {refreshing ? '正在永久刪除資料...' : '確認永久刪除帳號'}
          </button>
          <button
            onClick={onClose}
            className="w-full py-5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-2xl text-zinc-400 font-bold text-sm"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
