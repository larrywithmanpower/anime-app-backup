'use client';

interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-black/85 p-6 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-[28px] border border-ink-border bg-ink-deep/95 p-7 backdrop-blur-2xl animate-in zoom-in-95 duration-200 shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
        <div className="absolute inset-x-14 -top-px h-px bg-gradient-to-r from-transparent via-star/55 to-transparent" />

        <h2 className="font-display mb-5 text-[18px] font-bold tracking-tight text-mist">
          操作小技巧
        </h2>
        <div className="custom-scrollbar max-h-[60vh] space-y-4 overflow-y-auto pr-2 text-[13px] font-normal leading-relaxed text-mist-silver">
          <Row glyph="+" color="moon">
            點擊右上角 <span className="text-mist">+ 號</span> 可於當前帳號下新增追蹤項目
          </Row>
          <Row glyph="↩" color="cinnabar">
            點擊 <span className="text-mist">登出</span> 可切換不同帳號
          </Row>
          <Row glyph="⋯" color="star">
            名稱過長會縮略，<span className="text-mist">點擊標題</span>即可展開／收合
          </Row>
          <Row glyph="✎" color="mist">
            點擊標題旁的 <span className="text-mist">筆圖示</span> 可修改動畫名稱
          </Row>

          <div className="border-t border-ink-border pt-5">
            <div className="mb-3 flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-moon" />
              <h3 className="font-display text-[10px] font-bold uppercase tracking-[0.32em] text-mist">
                安裝為 App（PWA）
              </h3>
            </div>
            <div className="space-y-3 pl-3.5">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.28em] text-mist-shadow">
                  iOS（Safari）
                </span>
                <p>
                  點擊瀏覽器底部的
                  <span className="text-mist">「分享」</span>
                  按鈕，選擇
                  <span className="font-bold text-moon">「加入主畫面」</span>
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.28em] text-mist-shadow">
                  Android（Chrome）
                </span>
                <p>
                  點擊右上角
                  <span className="text-mist">「⋮」</span>
                  選單，選擇
                  <span className="font-bold text-moon">「安裝應用程式」</span>
                </p>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="font-display mt-7 w-full rounded-2xl border border-ink-border bg-ink-black/60 py-3.5 text-[12px] tracking-[0.32em] text-mist-silver transition-all hover:text-mist active:scale-[0.98]"
        >
          我 知 道 了
        </button>
      </div>
    </div>
  );
}

function Row({
  glyph,
  color,
  children,
}: {
  glyph: string;
  color: 'moon' | 'cinnabar' | 'star' | 'mist';
  children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    moon: 'bg-moon/12 text-moon border-moon/30',
    cinnabar: 'bg-cinnabar/12 text-cinnabar border-cinnabar/30',
    star: 'bg-star/12 text-star border-star/30',
    mist: 'bg-ink-mist text-mist-silver border-ink-border',
  };
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${colorMap[color]} text-[13px] font-bold`}
      >
        {glyph}
      </div>
      <p className="flex-1">{children}</p>
    </div>
  );
}
