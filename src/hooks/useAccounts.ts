'use client';

import { useState, useEffect, useRef } from 'react';
import { gasGet } from '@/lib/gas';

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

  // 背景預抓的帳號列表；登入時直接拿它，不必當場再等一次 GAS
  const accountListRef = useRef<Promise<unknown> | null>(null);

  /**
   * 預抓帳號列表。登入畫面一顯示就發，**不擋畫面**。
   *
   * GAS 容器閒置會被回收，第一支呼叫要付冷啟動（實測 5～36 秒，而且要 2～3 支才完全熱）。
   * 這筆錢一定有人付，差別在誰付——讓它跟使用者打帳號名稱的時間重疊，按下登入時
   * 通常已經回來了。失敗就把 ref 清掉，按登入時會自己重打
   */
  const prefetchAccountList = (): Promise<unknown> => {
    if (!APPS_SCRIPT_URL) return Promise.reject(new Error('Apps Script URL is missing'));

    // 走 gasGet：exec 會間歇性回 404，它本來就會重試一次
    const pending = gasGet<unknown>({ action: 'getSheets' }, Array.isArray);
    accountListRef.current = pending;
    pending.catch(() => {
      if (accountListRef.current === pending) accountListRef.current = null;
    });
    return pending;
  };

  const handleLogin = async () => {
    const name = loginName.trim();
    if (!name || !APPS_SCRIPT_URL) return;

    setVerifying(true);
    setLoginError('');

    try {
      // 登入畫面一開就在背景抓了，這裡通常直接拿到結果；還沒發過才當場打。
      // 背景那次可能已經失敗（exec 間歇性 404），**不能讓它連累登入**——
      // 舊版按登入是當場重新發一次，這裡要維持同樣的韌性
      let data: unknown;
      try {
        data = await (accountListRef.current || prefetchAccountList());
      } catch {
        data = await prefetchAccountList();
      }
      const failure = (data as { error?: string })?.error;

      if (failure) {
        setLoginError('API 錯誤: ' + failure);
        return;
      }

      const latestAccounts: string[] = Array.isArray(data) ? data : [];

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
    // 回到登入畫面就重抓一份：舊的可能是幾天前的，而且順便把 GAS 容器叫醒
    prefetchAccountList().catch(() => {});
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

  /**
   * 初始化：**一次 GAS 都不打**，直接決定要進主畫面還是登入畫面。
   *
   * 以前沒有 lastAccount 時會先抓帳號列表才放行，等於拿一支 9～23 秒的 `getSheets`
   * 擋住首屏——iOS 加到主畫面的 App 有自己獨立的 localStorage，等同全新裝置，
   * 每次都會走到這條路，畫面就一直停在「載入中」。列表在按下登入時才真的需要
   */
  useEffect(() => {
    const saved = localStorage.getItem('lastAccount');
    if (saved) {
      setCurrentAccount(saved);
      setIsLoggedIn(true);
    } else {
      // 擋不到畫面，純粹讓冷啟動提早開始跑
      prefetchAccountList().catch(() => {});
    }
    setInitializing(false);
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
    handleLogin,
    handleLogout,
    handleCreateAccount,
  };
}
