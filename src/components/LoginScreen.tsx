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
    <main className="min-h-screen bg-black text-white p-6 flex flex-col justify-center items-center relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[200%] h-96 bg-blue-600/10 blur-[120px] -z-10 rounded-full" />

      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-black tracking-tighter mb-2 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent italic">
            TRACKER
          </h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-[0.3em]">動畫追蹤管理系統</p>
        </header>

        <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[40px] backdrop-blur-xl shadow-2xl relative">
          <h2 className="text-xl font-black mb-6 text-white tracking-tight">歡迎回來</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">帳號名稱</label>
              <input
                type="text"
                placeholder="輸入您的帳號名稱"
                value={loginName}
                onChange={(e) => {
                  onLoginNameChange(e.target.value);
                  onLoginErrorChange('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && onLogin()}
                className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-700"
              />
            </div>

            {loginError && (
              <p className="text-red-400 text-[10px] font-bold ml-1">{loginError}</p>
            )}

            <button
              onClick={onLogin}
              disabled={verifying || !loginName.trim()}
              className="w-full py-4.5 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-2xl text-white font-black text-sm shadow-xl shadow-blue-900/20 disabled:opacity-50 disabled:active:scale-100"
            >
              {verifying ? '驗證中...' : '進行登入'}
            </button>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest leading-none bg-zinc-900/0"><span className="px-3 text-zinc-600 bg-zinc-900/0">尚未擁有帳號？</span></div>
            </div>

            <button
              onClick={() => onShowCreateAccount(true)}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-2xl text-white font-bold text-xs"
            >
              建立新帳號
            </button>
          </div>
        </div>
      </div>

      {/* 建立帳號 Modal */}
      {showCreateAccount && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black mb-1 text-white tracking-tight">建立新帳號</h2>
            <p className="text-zinc-500 text-[9px] mb-6 font-bold uppercase tracking-widest">系統將在 Google Sheets 建立新分頁</p>
            <input
              type="text"
              placeholder="帳號名稱 (例如: larry)"
              value={loginName}
              onChange={(e) => onLoginNameChange(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-blue-500 transition-all mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => onShowCreateAccount(false)}
                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-2xl text-zinc-400 font-bold text-xs"
              >
                返回
              </button>
              <button
                onClick={onCreateAccount}
                disabled={!loginName.trim() || refreshing}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-2xl text-white font-bold text-xs shadow-xl shadow-blue-900/20 disabled:opacity-50"
              >
                {refreshing ? '建立中...' : '確認建立'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
