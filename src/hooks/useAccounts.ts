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

  /**
   * 抓帳號列表。**只有登入畫面需要**，主畫面一律不要呼叫。
   *
   * `getSheets` 實測要 9～23 秒（GAS 冷啟動 + openById），而 Apps Script 對同一個
   * 使用者的執行會排隊，跟讀清單同時發等於讓清單卡在它後面。列表本身畫面又沒在用
   */
  const fetchAccountList = async () => {
    if (!APPS_SCRIPT_URL) {
      console.error('Apps Script URL is missing');
      setInitializing(false);
      return;
    }
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getSheets`);
      const data = await res.json();
      if (Array.isArray(data)) setAccounts(data);
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setInitializing(false);
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
      // GAS 失敗時仍回 HTTP 200，錯誤放在 body，只看 res.ok 會誤判成功
      const result = await res.json();
      if (!res.ok || result?.error) {
        setLoginError(result?.error || '建立失敗');
        return;
      }

      // 不再重抓帳號列表：那是一趟 9～23 秒的 getSheets，而剛建好的名稱這裡本來就有
      setShowCreateAccount(false);
      setAccounts(prev => [...prev, name]);
      setCurrentAccount(name);
      localStorage.setItem('lastAccount', name);
      setIsLoggedIn(true);
    } catch {
      setLoginError('網路錯誤，請稍後再試');
    } finally {
      setVerifying(false);
    }
  };

  // 初始化：有記住的帳號就直接進主畫面，一次 GAS 都不打
  useEffect(() => {
    const saved = localStorage.getItem('lastAccount');
    if (saved) {
      setCurrentAccount(saved);
      setIsLoggedIn(true);
      setInitializing(false);
    } else {
      fetchAccountList();
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
