'use client';

interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[32px] shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
        <h2 className="text-xl font-black mb-5 text-white tracking-tight">操作小技巧</h2>
        <div className="space-y-4 text-zinc-400 text-xs font-medium max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-lg bg-green-600/20 flex items-center justify-center text-green-400 shrink-0 text-[10px] font-bold">+</div>
            <p>點擊右上角的 <span className="text-white">+ 號</span> 即可在當前帳號下新增新的追蹤項目。</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 flex items-center justify-center text-red-500 shrink-0 text-[10px] font-bold">OUT</div>
            <p>點擊右上角的 <span className="text-white">登出</span> 即可更換登入不同的帳號。</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 shrink-0 text-[10px] font-bold">...</div>
            <p>名稱太長會縮略，<span className="text-white">直接點擊標題</span> 即可展開查看完整內容。</p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 text-[14px] font-bold">✎</div>
            <p>點擊標題旁的 <span className="text-white">筆圖示</span> 可修改動畫名稱。</p>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <h3 className="text-white font-black uppercase tracking-widest text-[10px]">安裝為 App (PWA)</h3>
            </div>
            <div className="space-y-3 pl-3.5">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">iOS (Safari)</span>
                <p>點擊瀏覽器底部的 <span className="text-zinc-300">「分享」</span> 按鈕，然後選擇 <span className="text-blue-400 font-bold">「加入主畫面」</span>。</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Android (Chrome)</span>
                <p>點擊右上角 <span className="text-zinc-300">「...」</span> 選單，然後選擇 <span className="text-blue-400 font-bold">「安裝應用程式」</span>。</p>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-8 w-full py-4 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-2xl text-white font-bold text-xs shadow-xl"
        >
          我知道了
        </button>
      </div>
    </div>
  );
}
