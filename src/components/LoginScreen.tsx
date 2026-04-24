'use client';

interface LoginScreenProps {
  loginName: string;
  loginError: string;
  verifying: boolean;
  showCreateAccount: boolean;
  refreshing: boolean;
  onLoginNameChange: (value: string) => void;
  onLoginErrorChange: (value: string) => void;
  onLogin: () => void;
  onShowCreateAccount: (show: boolean) => void;
  onCreateAccount: () => void;
}

function MoonMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M 12 3 A 9 9 0 1 0 12 21 A 6.5 6.5 0 1 1 12 3 Z"
        fill="currentColor"
      />
      <circle cx="19" cy="5" r="0.9" fill="currentColor" opacity="0.8" />
      <circle cx="21.5" cy="9" r="0.55" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

export default function LoginScreen({
  loginName,
  loginError,
  verifying,
  showCreateAccount,
  refreshing,
  onLoginNameChange,
  onLoginErrorChange,
  onLogin,
  onShowCreateAccount,
  onCreateAccount,
}: LoginScreenProps) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-6 text-mist">
      {/* 頂部極淡星光 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[45vh] bg-[radial-gradient(ellipse_60%_100%_at_50%_0%,var(--star-glow),transparent_72%)]" />

      <div className="star-rise w-full max-w-sm">
        <header className="mb-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="moon-breath text-moon">
              <MoonMark className="h-10 w-10" />
            </div>
          </div>
          <h1 className="font-display mb-3 text-[46px] font-bold leading-none tracking-[0.2em] text-mist">
            TRACKER
          </h1>
          <div className="flex items-center justify-center gap-2.5">
            <span className="h-px w-7 bg-moon/50" />
            <p className="font-display text-[11px] tracking-[0.35em] text-mist-silver">
              夜 · 航 · 追 · 番
            </p>
            <span className="h-px w-7 bg-moon/50" />
          </div>
        </header>

        <div className="relative rounded-[28px] border border-ink-border bg-ink-deep/75 p-8 backdrop-blur-2xl shadow-[0_40px_80px_-40px_rgba(0,0,0,0.8)]">
          <div className="absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-moon/55 to-transparent" />

          <h2 className="font-display mb-6 text-[18px] font-bold tracking-tight text-mist">
            歡迎回來
          </h2>

          <div className="space-y-5">
            <div>
              <label className="mb-2 ml-1 block font-display text-[9px] uppercase tracking-[0.35em] text-mist-shadow">
                帳 號 名 稱
              </label>
              <input
                type="text"
                placeholder="輸入您的帳號名稱"
                value={loginName}
                onChange={(e) => {
                  onLoginNameChange(e.target.value);
                  onLoginErrorChange('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && onLogin()}
                className="w-full rounded-2xl border border-ink-border bg-ink-black/70 px-5 py-3.5 font-mono text-[14px] font-medium text-mist placeholder:text-mist-shadow focus:border-moon/60 focus:outline-none transition-all"
              />
            </div>

            {loginError && (
              <p className="ml-1 text-[11px] font-medium text-cinnabar/90">{loginError}</p>
            )}

            <button
              onClick={onLogin}
              disabled={verifying || !loginName.trim()}
              className="font-display relative w-full overflow-hidden rounded-2xl border border-moon/40 bg-gradient-to-b from-moon to-moon-soft py-4 text-[13px] font-bold tracking-[0.35em] text-ink-black shadow-[0_18px_45px_-18px_var(--moon-glow)] transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100"
            >
              {verifying ? '驗 證 中' : '進 入'}
            </button>

            <div className="relative py-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-ink-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="font-display bg-ink-deep px-3 text-[9px] uppercase tracking-[0.38em] text-mist-shadow">
                  尚 未 擁 有 帳 號
                </span>
              </div>
            </div>

            <button
              onClick={() => onShowCreateAccount(true)}
              className="font-display w-full rounded-2xl border border-ink-border bg-ink-black/60 py-3.5 text-[12px] tracking-[0.3em] text-mist-silver transition-all hover:border-star/45 hover:bg-star/5 hover:text-star active:scale-[0.98]"
            >
              建 立 新 帳 號
            </button>
          </div>
        </div>

        <p className="font-display mt-8 text-center text-[10px] tracking-[0.35em] text-mist-shadow">
          一 集 一 頁 &nbsp;·&nbsp; 銀 河 為 記
        </p>
      </div>

      {showCreateAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-black/90 p-6 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="relative w-full max-w-xs rounded-[28px] border border-ink-border bg-ink-deep/95 p-8 backdrop-blur-2xl animate-in zoom-in-95 duration-200">
            <div className="absolute inset-x-12 -top-px h-px bg-gradient-to-r from-transparent via-moon/55 to-transparent" />
            <div className="mb-5 flex items-center gap-2.5">
              <span className="text-moon">
                <MoonMark className="h-4 w-4" />
              </span>
              <h2 className="font-display text-[18px] font-bold tracking-tight text-mist">
                建立新帳號
              </h2>
            </div>
            <p className="mb-6 text-[10px] uppercase tracking-[0.28em] text-mist-shadow">
              系統將在 Google Sheets 建立新分頁
            </p>
            <input
              type="text"
              placeholder="帳號名稱（例如：larry）"
              value={loginName}
              onChange={(e) => onLoginNameChange(e.target.value)}
              className="mb-6 w-full rounded-2xl border border-ink-border bg-ink-black/70 px-5 py-3.5 font-mono text-[13px] text-mist placeholder:text-mist-shadow focus:border-moon/60 focus:outline-none transition-all"
            />
            <div className="flex gap-3">
              <button
                onClick={() => onShowCreateAccount(false)}
                className="font-display flex-1 rounded-2xl border border-ink-border bg-ink-black/60 py-3.5 text-[11px] tracking-[0.3em] text-mist-silver transition-all active:scale-[0.97]"
              >
                返 回
              </button>
              <button
                onClick={onCreateAccount}
                disabled={!loginName.trim() || refreshing}
                className="font-display flex-1 rounded-2xl border border-moon/40 bg-gradient-to-b from-moon to-moon-soft py-3.5 text-[11px] font-bold tracking-[0.3em] text-ink-black shadow-[0_12px_32px_-14px_var(--moon-glow)] transition-all active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {refreshing ? '建 立 中' : '確 認'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
