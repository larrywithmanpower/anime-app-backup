'use client';

import { useState, useEffect } from 'react';

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

export function useAccounts() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [currentAccount, setCurrentAccount] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [loginName, setLoginName] = useState('');
  const [loginError, setLoginError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);

  const fetchAccountList = async (isSilent = false) => {
    if (!APPS_SCRIPT_URL) {
      console.error('Apps Script URL is missing');
      setInitializing(false);
      return;
    }
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getSheets`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAccounts(data);
        const saved = localStorage.getItem('lastAccount');
        const matched = saved ? data.find((acc: string) => acc.toLowerCase() === saved.toLowerCase()) : null;
        if (matched) {
          setCurrentAccount(matched);
          setIsLoggedIn(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      if (!isSilent) {
        setInitializing(false);
      }
    }
  };

  const handleLogin = async () => {
    const name = loginName.trim();
    if (!name || !APPS_SCRIPT_URL) return;

    setVerifying(true);
    setLoginError('');

    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getSheets`);
      const data = await res.json();

      if (data.error) {
        setLoginError('API 錯誤: ' + data.error);
        return;
      }

      const latestAccounts = Array.isArray(data) ? data : [];

      // 偵測是否回傳了原始數據列 (表示 GAS 版本過舊)
      if (latestAccounts.length > 0 && Array.isArray(latestAccounts[0])) {
        setLoginError('偵測到 Google 腳本版本過舊。請將 apps-script-code.gs 更新後，點擊「部署 > 管理部署 > 編輯 > 版本：全新版本」並重新發佈。');
        return;
      }

      setAccounts(latestAccounts);

      // 大小寫不敏感搜尋
      const matchedAccount = latestAccounts.find(
        (acc: string) => typeof acc === 'string' && acc.toLowerCase() === name.toLowerCase()
      );

      if (matchedAccount) {
        setCurrentAccount(matchedAccount);
        localStorage.setItem('lastAccount', matchedAccount);
        setIsLoggedIn(true);
      } else {
        const available = latestAccounts.length > 0 ? ` (現有: ${latestAccounts.join(', ')})` : ' (未偵測到分頁)';
        setLoginError('找不到該帳號，請確認名稱是否正確' + available);
      }
    } catch {
      setLoginError('登入發生錯誤，請檢查網路連接或 Apps Script 部署');
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('lastAccount');
    setCurrentAccount('');
    setIsLoggedIn(false);
    setLoginName('');
  };

  const handleCreateAccount = async () => {
    const name = loginName.trim();
    if (!name || !APPS_SCRIPT_URL) return;

    setVerifying(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({ action: 'createSheet', name: name }),
      });
      if (res.ok) {
        setShowCreateAccount(false);
        await fetchAccountList();
        setCurrentAccount(name);
        localStorage.setItem('lastAccount', name);
        setIsLoggedIn(true);
      } else {
        const error = await res.json();
        setLoginError(error.error || '建立失敗');
      }
    } catch {
      setLoginError('網路錯誤，請稍後再試');
    } finally {
      setVerifying(false);
    }
  };

  // 初始化：優先從 localStorage 讀取帳號加速啟動
  useEffect(() => {
    const saved = localStorage.getItem('lastAccount');
    if (saved) {
      setCurrentAccount(saved);
      setIsLoggedIn(true);
      setInitializing(false); // 已有帳號，直接進入主介面
      fetchAccountList(true); // 背景同步帳號列表
    } else {
      fetchAccountList(); // 正常初始化
    }
  }, []);

  return {
    accounts,
    currentAccount,
    isLoggedIn,
    initializing,
    loginName,
    loginError,
    verifying,
    showCreateAccount,
    setLoginName,
    setLoginError,
    setShowCreateAccount,
    fetchAccountList,
    handleLogin,
    handleLogout,
    handleCreateAccount,
  };
}
