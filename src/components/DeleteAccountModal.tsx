'use client';

import { useState } from 'react';
import Modal, { fieldClass } from './Modal';

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
  const [confirmText, setConfirmText] = useState('');
  const matched = confirmText.trim().toLowerCase() === currentAccount.toLowerCase();

  return (
    <Modal
      title="註銷帳號"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="h-10 flex-1 rounded-lg border border-line text-[14px] text-dim transition-colors hover:text-text"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            disabled={!matched || refreshing}
            className="h-10 flex-1 rounded-lg bg-danger text-[14px] font-semibold text-white transition-colors hover:bg-danger/85 disabled:opacity-40"
          >
            {refreshing ? '刪除中…' : '永久刪除'}
          </button>
        </div>
      }
    >
      <p className="text-[14px] leading-relaxed text-dim">
        這會永久刪除 Google Sheets 上「
        <span className="font-semibold text-text">{currentAccount}</span>」分頁的所有紀錄，無法復原。
      </p>
      <p className="mb-2 mt-4 text-[12px] text-faint">請輸入帳號名稱以確認：</p>
      <input
        type="text"
        value={confirmText}
        onChange={e => setConfirmText(e.target.value)}
        placeholder={currentAccount}
        className={fieldClass}
      />
    </Modal>
  );
}
