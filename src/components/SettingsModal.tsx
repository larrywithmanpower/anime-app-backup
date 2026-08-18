'use client';

import { useState } from 'react';
import Modal, { fieldClass, labelClass } from './Modal';
import { getGimyDomain, setGimyDomain, DEFAULT_GIMY_DOMAIN } from '@/lib/watchUrl';

interface SettingsModalProps {
  currentAccount: string;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onShowHelp: () => void;
  onClose: () => void;
}

export default function SettingsModal({
  currentAccount,
  onLogout,
  onDeleteAccount,
  onShowHelp,
  onClose,
}: SettingsModalProps) {
  const [domain, setDomain] = useState(getGimyDomain());
  const [saved, setSaved] = useState(false);

  const saveDomain = () => {
    setGimyDomain(domain);
    setDomain(getGimyDomain());
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <Modal title="設定" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <label className={labelClass}>gimy 網域</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder={DEFAULT_GIMY_DOMAIN}
              className={fieldClass}
            />
            <button
              onClick={saveDomain}
              className="h-10 shrink-0 rounded-lg border border-line px-3 text-[13px] text-dim transition-colors hover:border-line-hi hover:text-text"
            >
              {saved ? '已存' : '儲存'}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
            gimy 換網域時只要改這裡，所有作品的「看」按鈕會自動跟著更新。
            此設定存在這台裝置，換瀏覽器要重設一次。
          </p>
        </div>

        <div className="border-t border-line pt-4">
          <p className={labelClass}>帳號</p>
          <p className="mb-3 text-[14px] font-semibold text-text">{currentAccount}</p>

          <div className="space-y-1.5">
            <button
              onClick={onShowHelp}
              className="w-full rounded-lg border border-line px-3 py-2.5 text-left text-[13px] text-dim transition-colors hover:text-text"
            >
              使用說明
            </button>
            <button
              onClick={onLogout}
              className="w-full rounded-lg border border-line px-3 py-2.5 text-left text-[13px] text-dim transition-colors hover:text-text"
            >
              登出
            </button>
            <button
              onClick={onDeleteAccount}
              className="w-full rounded-lg border border-danger/30 px-3 py-2.5 text-left text-[13px] text-danger transition-colors hover:bg-danger/10"
            >
              註銷帳號（永久刪除所有資料）
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
