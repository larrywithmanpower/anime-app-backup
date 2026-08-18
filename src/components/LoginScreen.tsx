'use client';

import Modal, { fieldClass } from './Modal';

interface LoginScreenProps {
  loginName: string;
  loginError: string;
  verifying: boolean;
  showCreateAccount: boolean;
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
  onLoginNameChange,
  onLoginErrorChange,
  onLogin,
  onShowCreateAccount,
  onCreateAccount,
}: LoginScreenProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-bg p-6">
      <div className="fade-up w-full max-w-xs">
        <h1 className="mb-1 text-[24px] font-bold tracking-tight text-text">追番進度</h1>
        <p className="mb-8 text-[13px] text-faint">動畫、日劇、影集的追看紀錄</p>

        <label className="mb-1.5 block text-[12px] font-medium text-dim">帳號名稱</label>
        <input
          autoFocus
          type="text"
          placeholder="例如：larry"
          value={loginName}
          onChange={e => {
            onLoginNameChange(e.target.value);
            onLoginErrorChange('');
          }}
          onKeyDown={e => e.key === 'Enter' && onLogin()}
          className={fieldClass}
        />

        {loginError && <p className="mt-2 text-[12px] leading-relaxed text-danger">{loginError}</p>}

        <button
          onClick={onLogin}
          disabled={verifying || !loginName.trim()}
          className="mt-4 h-10 w-full rounded-lg bg-accent text-[14px] font-semibold text-white transition-colors hover:bg-accent-hi disabled:opacity-40"
        >
          {verifying ? '驗證中…' : '進入'}
        </button>

        <button
          onClick={() => onShowCreateAccount(true)}
          className="mt-2 h-10 w-full rounded-lg border border-line text-[13px] text-dim transition-colors hover:border-line-hi hover:text-text"
        >
          建立新帳號
        </button>
      </div>

      {showCreateAccount && (
        <Modal
          title="建立新帳號"
          onClose={() => onShowCreateAccount(false)}
          footer={
            <button
              onClick={onCreateAccount}
              disabled={!loginName.trim() || verifying}
              className="h-10 w-full rounded-lg bg-accent text-[14px] font-semibold text-white transition-colors hover:bg-accent-hi disabled:opacity-40"
            >
              {verifying ? '建立中…' : '建立'}
            </button>
          }
        >
          <input
            autoFocus
            type="text"
            placeholder="帳號名稱（例如：larry）"
            value={loginName}
            onChange={e => onLoginNameChange(e.target.value)}
            className={fieldClass}
          />
          <p className="mt-2 text-[11px] leading-relaxed text-faint">
            會在你的 Google Sheets 建立一個同名分頁，資料互相獨立。
          </p>
        </Modal>
      )}
    </main>
  );
}
