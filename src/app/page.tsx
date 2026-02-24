'use client';

import { useState, useEffect } from 'react';
import { checkAnimeUpdates } from '@/lib/gemini';

interface AnimeItem {
  rowNumber: number;
  date: string;
  name: string;
  progress: string;
  latest?: string; // AI detected latest episode
  favorite?: boolean; // Tracking status
}

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

export default function AnimeTracker() {
  const [hasMounted, setHasMounted] = useState(false);
  const [list, setList] = useState<AnimeItem[]>([]);
  const [initializing, setInitializing] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [currentAccount, setCurrentAccount] = useState<string>('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newItemName, setNewItemName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<AnimeItem | null>(null);
  const [itemToRename, setItemToRename] = useState<AnimeItem | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [loginName, setLoginName] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isCheckingAI, setIsCheckingAI] = useState(false);
  const [aiUpdatesFound, setAiUpdatesFound] = useState(false);
  const [failedAnimeNames, setFailedAnimeNames] = useState<string[]>([]);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [aiGlobalError, setAiGlobalError] = useState<string | null>(null);

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
          // If we recovered from storage, we might have set initializing to false already.
          // But if not, we do it here.
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

  const fetchData = async (sheetOverride?: string) => {
    const sheet = sheetOverride || currentAccount;
    if (!sheet || !APPS_SCRIPT_URL) {
      setInitializing(false);
      return;
    }

    setRefreshing(true);
    try {
      const url = `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(sheet)}`;
      const res = await fetch(url);
      const rawData = await res.json();

      // Mapping logic moved from API route
      if (Array.isArray(rawData)) {
        const mappedData = rawData
          .slice(1) // Skip header row
          .map((row: any[], index: number) => ({
            rowNumber: index + 2,
            date: row[0] || '',
            name: row[1] || '',
            progress: row[2] || '',
            latest: row[3] || '',
            favorite: row[4] === true || row[4] === 'TRUE',
          })).filter(item => item.name);
        setList(mappedData);
        return mappedData;
      }
      return [];
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      setRefreshing(false);
      setInitializing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchData();
    setAiUpdatesFound(false);
  };

  const checkAIProgress = async (listOverride?: AnimeItem[]) => {
    const listToUse = listOverride || list;
    const trackingList = listToUse.filter(item => item.favorite);
    if (trackingList.length === 0 || isCheckingAI) return;
    setIsCheckingAI(true);
    try {
      const data = await checkAnimeUpdates(trackingList.map(item => ({
        id: item.rowNumber,
        name: item.name,
        current: item.progress
      })));

      if (data.updates) {
        // Update local state temporarily
        let foundNew = false;
        let failedCount = 0;
        const failedNames: string[] = [];

        setList(prev => prev.map(item => {
          // 優先使用 Row ID 進行匹配 (解決繁簡體與名稱不一致問題)
          const update = data.updates.find((u: any) =>
            String(u.id) === String(item.rowNumber) || u.name === item.name
          );

          if (update) {
            if (update.latest === "搜尋失敗") {
              failedCount++;
              failedNames.push(item.name);
              return item; // Keep current latest if failed
            }
            // Check if this is actually newer than current progress
            if (hasNewEpisode(update.latest, item.progress)) {
              foundNew = true;
            }
            return { ...item, latest: update.latest };
          }
          return item;
        }));

        if (failedNames.length > 0) {
          setFailedAnimeNames(failedNames);
        }

        if (foundNew) {
          setAiUpdatesFound(true);
        }

        // Batch update to GAS so it persists
        if (APPS_SCRIPT_URL) {
          // Map updates to include row numbers for direct addressing
          const updatesWithRows = data.updates.map((u: any) => {
            const localItem = listToUse.find(item => item.name === u.name);
            return {
              name: u.name,
              latest: u.latest,
              row: localItem ? localItem.rowNumber : undefined
            };
          });

          const gasRes = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            redirect: 'follow',
            body: JSON.stringify({
              action: 'updateLatestBatch',
              sheet: currentAccount,
              updates: updatesWithRows
            }),
          });
          await gasRes.json();
        }
      }
    } catch (err: any) {
      console.error("AI Check failed:", err);
      // Notify user when all models fail
      setAiGlobalError(err.message || "AI 服務暫時無法使用，請稍後再試。");
    } finally {
      setIsCheckingAI(false);
    }
  };

  // Helper to compare progress with AI latest (robust string comparison)
  const hasNewEpisode = (latest?: string, progress?: string) => {
    if (!latest || !progress) return false;
    const l = String(latest).trim();
    const p = String(progress).trim();
    // Compare as numbers if possible, otherwise string mismatch
    if (!isNaN(Number(l)) && !isNaN(Number(p))) {
      return Number(l) > Number(p);
    }
    return l !== p;
  };

  const applyAIUpdates = async () => {
    if (!APPS_SCRIPT_URL) return;
    setRefreshing(true);
    try {
      // Find items where latest is a number and different from current progress
      const updates = list.filter(item =>
        item.latest &&
        /^\d+$/.test(item.latest) &&
        item.latest !== item.progress
      );

      for (const item of updates) {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          redirect: 'follow',
          body: JSON.stringify({
            action: 'update',
            row: item.rowNumber,
            progress: item.latest,
            sheet: currentAccount
          }),
        });
      }

      setAiUpdatesFound(false);
      await fetchData();
    } catch (err) {
      console.error("Failed to apply updates:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setHasMounted(true);

    // 優先從本地讀取帳號，加速啟動
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

  useEffect(() => {
    if (isLoggedIn && currentAccount) {
      fetchData();
    }
  }, [isLoggedIn, currentAccount]);

  useEffect(() => {
    if (aiUpdatesFound) {
      const timer = setTimeout(() => setAiUpdatesFound(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [aiUpdatesFound]);

  useEffect(() => {
    if (failedAnimeNames.length > 0) {
      const timer = setTimeout(() => setFailedAnimeNames([]), 6000);
      return () => clearTimeout(timer);
    }
  }, [failedAnimeNames]);

  useEffect(() => {
    if (aiGlobalError) {
      const timer = setTimeout(() => setAiGlobalError(null), 7000);
      return () => clearTimeout(timer);
    }
  }, [aiGlobalError]);

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

      // Case-insensitive search
      const matchedAccount = latestAccounts.find(
        acc => typeof acc === 'string' && acc.toLowerCase() === name.toLowerCase()
      );

      if (matchedAccount) {
        setCurrentAccount(matchedAccount);
        localStorage.setItem('lastAccount', matchedAccount);
        setIsLoggedIn(true);
      } else {
        const available = latestAccounts.length > 0 ? ` (現有: ${latestAccounts.join(', ')})` : ' (未偵測到分頁)';
        setLoginError('找不到該帳號，請確認名稱是否正確' + available);
      }
    } catch (err) {
      setLoginError('登入發生錯誤，請檢查網路連接或 Apps Script 部署');
    } finally {
      setVerifying(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('lastAccount');
    setCurrentAccount('');
    setIsLoggedIn(false);
    setList([]);
    setLoginName('');
  };

  const handleDeleteItem = async (item: AnimeItem) => {
    if (!APPS_SCRIPT_URL) return;
    setRefreshing(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({
          action: 'deleteItem',
          sheet: currentAccount,
          row: item.rowNumber
        }),
      });
      const result = await res.json();
      if (res.ok && !result.error) {
        setItemToDelete(null);
        fetchData(); // Refresh list to get new row indices
      } else {
        alert('刪除失敗: ' + (result.error || '未知錯誤'));
      }
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('網路傳輸失敗');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddItem = async () => {
    if (!newItemName.trim() || !APPS_SCRIPT_URL) return;
    setRefreshing(true);
    try {
      const requestBody = { action: 'addItem', sheet: currentAccount, name: newItemName.trim() };

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify(requestBody),
      });
      const result = await res.json();

      if (res.ok && !result.error) {
        setNewItemName('');
        setShowAddItem(false);
        fetchData(); // Refresh list
      } else {
        alert('新增失敗: ' + (result.error || '未知錯誤'));
      }
    } catch (err) {
      console.error('Failed to add item:', err);
      alert('網路通訊失敗，請檢查 API 連線');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateAccount = async () => {
    const name = (newAccountName || loginName).trim();
    if (!name || !APPS_SCRIPT_URL) return;

    setVerifying(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({ action: 'createSheet', name: name }),
      });
      if (res.ok) {
        setNewAccountName('');
        setShowCreateAccount(false);
        await fetchAccountList();
        setCurrentAccount(name);
        localStorage.setItem('lastAccount', name);
        setIsLoggedIn(true);
      } else {
        const error = await res.json();
        setLoginError(error.error || '建立失敗');
      }
    } catch (err) {
      setLoginError('網路錯誤，請稍後再試');
    } finally {
      setVerifying(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentAccount || !APPS_SCRIPT_URL) return;
    setRefreshing(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({
          action: 'deleteAccount',
          name: currentAccount,
          sheet: currentAccount
        }),
      });
      const result = await res.json();
      if (res.ok && !result.error) {
        setShowDeleteAccount(false);
        handleLogout();
        await fetchAccountList();
      } else {
        alert('刪除帳號失敗: ' + (result.error || '未知錯誤'));
      }
    } catch (err) {
      console.error('Failed to delete account:', err);
      alert('網路傳輸失敗');
    } finally {
      setRefreshing(false);
    }
  };

  const handleUpdateName = async () => {
    if (!itemToRename || !renameValue.trim() || !APPS_SCRIPT_URL) return;
    setRefreshing(true);
    try {

      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({
          action: 'updateName',
          row: itemToRename.rowNumber, // Using 'row' as expected by GAS
          name: renameValue.trim(),
          sheet: currentAccount
        }),
      });
      const result = await res.json();

      if (res.ok && !result.error) {
        setItemToRename(null);
        fetchData();
      } else {
        alert('修改名稱失敗: ' + (result.error || '未知錯誤'));
      }
    } catch (err) {
      console.error('Failed to update name:', err);
      alert('網路傳輸失敗');
    } finally {
      setRefreshing(false);
    }
  };

  const handleProgressUpdate = async (item: AnimeItem, newProgress: string) => {
    if (!APPS_SCRIPT_URL) return;
    const newDate = new Date().toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).replace(/\//g, '/');

    setList(prev => prev.map(i =>
      i.rowNumber === item.rowNumber
        ? { ...i, progress: newProgress, date: newDate }
        : i
    ));

    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({
          action: 'update',
          row: item.rowNumber, // GAS expects 'row'
          progress: newProgress,
          sheet: currentAccount
        }),
      });
      if (!res.ok) throw new Error('Update failed');
    } catch (err) {
      console.error(err);
      fetchData();
    }
  };

  const handleIncrement = (item: AnimeItem) => {
    const newProgress = (parseInt(item.progress || '0') + 1).toString();
    handleProgressUpdate(item, newProgress);
  };

  const handleDecrement = (item: AnimeItem) => {
    const current = parseInt(item.progress || '0');
    if (current <= 0) return;
    const newProgress = (current - 1).toString();
    handleProgressUpdate(item, newProgress);
  };

  const toggleExpand = (rowNumber: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [rowNumber]: !prev[rowNumber]
    }));
  };

  const handleToggleFavorite = async (item: AnimeItem) => {
    if (!APPS_SCRIPT_URL) return;
    const newFavorite = !item.favorite;

    // Update local state first
    setList(prev => prev.map(i =>
      i.rowNumber === item.rowNumber
        ? { ...i, favorite: newFavorite, latest: newFavorite ? i.latest : '' }
        : i
    ));

    try {
      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({
          action: 'toggleFavorite',
          sheet: currentAccount,
          row: item.rowNumber,
          favorite: newFavorite
        }),
      });
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  const handleInputChange = (item: AnimeItem, value: string) => {
    // Update local state immediately for responsiveness
    setList(prev => prev.map(i =>
      i.rowNumber === item.rowNumber
        ? { ...i, progress: value }
        : i
    ));
  };

  const handleInputBlur = (item: AnimeItem) => {
    if (item.progress === '') {
      handleProgressUpdate(item, '0');
    } else {
      handleProgressUpdate(item, item.progress);
    }
  };

  if (!hasMounted) return null;

  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">系統初始化中...</p>
        {!APPS_SCRIPT_URL && (
          <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl max-w-xs">
            <p className="text-red-400 text-xs font-bold mb-2">設定錯誤</p>
            <p className="text-zinc-500 text-[9px] font-medium leading-relaxed">
              請檢查您的 .env.local 是否已正確設定 NEXT_PUBLIC_APPS_SCRIPT_URL
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!isLoggedIn) {
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
                    setLoginName(e.target.value);
                    setLoginError('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-700"
                />
              </div>

              {loginError && (
                <p className="text-red-400 text-[10px] font-bold ml-1">{loginError}</p>
              )}

              <button
                onClick={handleLogin}
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
                onClick={() => setShowCreateAccount(true)}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-2xl text-white font-bold text-xs"
              >
                建立新帳號
              </button>
            </div>
          </div>
        </div>

        {/* Create Account Modal inside Login Screen */}
        {showCreateAccount && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[40px] shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200">
              <h2 className="text-xl font-black mb-1 text-white tracking-tight">建立新帳號</h2>
              <p className="text-zinc-500 text-[9px] mb-6 font-bold uppercase tracking-widest">系統將在 Google Sheets 建立新分頁</p>
              <input
                type="text"
                placeholder="帳號名稱 (例如: larry)"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none focus:border-blue-500 transition-all mb-6"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateAccount(false)}
                  className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-2xl text-zinc-400 font-bold text-xs"
                >
                  返回
                </button>
                <button
                  onClick={handleCreateAccount}
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

  return (
    <main className="min-h-screen bg-black text-white pt-[calc(env(safe-area-inset-top)+6.5rem)] pb-24 relative overflow-x-hidden">
      {/* Background decoration - confined to prevent horizontal scroll */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-blue-600/10 blur-[100px] -z-10 rounded-full" />

      <header className="fixed top-0 left-0 right-0 z-50 pt-[calc(env(safe-area-inset-top)+1rem)] pb-4 bg-black/85 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter mb-1 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent italic leading-none">
              TRACKER
            </h1>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 text-[9px] font-black uppercase tracking-widest leading-none">使用者帳戶</span>
                <button
                  onClick={() => setShowDeleteAccount(true)}
                  className="text-[8px] font-black text-red-500/50 hover:text-red-400 uppercase tracking-widest px-1.5 py-0.5 active:scale-95 transition-all"
                >
                  [ 註銷帳號 ]
                </button>
              </div>

              <div className="text-lg font-black tracking-tight text-white px-0.5 leading-none">
                {currentAccount}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="text-[8px] font-black text-blue-500/50 hover:text-blue-400 uppercase tracking-widest px-1.5 py-1 active:scale-95 transition-all"
              >
                [ 登出 ]
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowAddItem(true)}
                className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 active:scale-90 transition-all"
                aria-label="新增項目"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              </button>

              <button
                onClick={() => setShowHelp(true)}
                className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 active:scale-90 transition-all"
                aria-label="使用說明"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </button>

              {/* AI Check Button Hidden
            <button
              onClick={() => checkAIProgress()}
              disabled={isCheckingAI || refreshing}
              className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all relative ${isCheckingAI ? 'bg-purple-500/20 border-purple-500/40 text-purple-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-purple-400'}`}
              aria-label="AI 檢查"
              title="執行 AI 追蹤檢查"
            >
              {isCheckingAI && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full animate-ping"></span>
              )}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`w-4.5 h-4.5 ${isCheckingAI ? 'animate-pulse' : ''}`}>
                <path d="M12 2v8"></path>
                <path d="M12 14v8"></path>
                <path d="M4.93 4.93l2.83 2.83"></path>
                <path d="M16.24 16.24l2.83 2.83"></path>
                <path d="M2 12h8"></path>
                <path d="M14 12h8"></path>
                <path d="M4.93 19.07l2.83-2.83"></path>
                <path d="M16.24 7.76l2.83-2.83"></path>
              </svg>
            </button>
            */}

              <button
                onClick={handleManualRefresh}
                disabled={refreshing || isCheckingAI}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${refreshing ? 'animate-spin bg-blue-500/20 border-blue-500/40 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-blue-400'}`}
                aria-label="重新整理"
                title="同步雲端數據"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
                  <path d="M23 4v6h-6"></path>
                  <path d="M1 20v-6h6"></path>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {aiUpdatesFound && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 duration-500">
          <div className="bg-red-600 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-400/30 backdrop-blur-md">
            <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            <p className="text-sm font-black tracking-tight">發現新集數更新！</p>
          </div>
        </div>
      )}

      {aiGlobalError && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[70] animate-in slide-in-from-top-4 duration-500 w-[90%] max-w-xs">
          <div className="bg-zinc-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-red-500/50 backdrop-blur-xl ring-1 ring-red-500/20">
            <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 shrink-0">!</div>
            <p className="text-xs font-bold leading-tight">{aiGlobalError}</p>
          </div>
        </div>
      )}

      {failedAnimeNames.length > 0 && (
        <div className="fixed top-40 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 duration-500 w-[90%] max-w-xs">
          <div className="bg-zinc-900/90 text-zinc-400 px-5 py-3 rounded-2xl shadow-2xl border border-zinc-800 backdrop-blur-md text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest mb-1 text-zinc-500">搜尋不順利</p>
            <p className="text-xs font-medium leading-relaxed">
              無法在網上查到 <span className="text-white font-bold">{failedAnimeNames.join(", ")}</span> 的最新進度資料。
            </p>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[32px] shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black mb-2 text-white tracking-tight">新增動畫</h2>
            <p className="text-zinc-500 text-[10px] mb-6 font-bold uppercase tracking-wider">將在您的追蹤清單新增一列</p>
            <input
              type="text"
              placeholder="動畫名稱 (例如: 龍之家族)"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 transition-all mb-6"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddItem(false)}
                className="flex-1 py-3.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-xl text-zinc-400 font-bold text-xs"
              >
                取消
              </button>
              <button
                onClick={handleAddItem}
                disabled={!newItemName.trim() || refreshing}
                className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-xl text-white font-bold text-xs shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                {refreshing ? '通訊中...' : '確認新增'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[36px] shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-red-500">
                <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              </svg>
            </div>
            <h3 className="text-xl font-black text-white mb-2">確認刪除？</h3>
            <p className="text-zinc-500 text-xs mb-8 leading-relaxed">
              確定要將 「<span className="text-zinc-300 font-bold">{itemToDelete.name}</span>」 從清單中永久移除嗎？
            </p>
            <div className="space-y-3">
              <button
                onClick={() => handleDeleteItem(itemToDelete)}
                disabled={refreshing}
                className="w-full py-4 bg-red-600 hover:bg-red-500 active:scale-95 transition-all rounded-2xl text-white font-black text-sm shadow-xl shadow-red-900/20"
              >
                {refreshing ? '處理中...' : '確認永久刪除'}
              </button>
              <button
                onClick={() => setItemToDelete(null)}
                className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-2xl text-zinc-400 font-bold text-sm"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {itemToRename && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/95 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[36px] shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-white mb-2 tracking-tight">修改名稱</h3>
            <p className="text-zinc-500 text-[10px] mb-6 font-bold uppercase tracking-wider">修正打錯的動畫名稱</p>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-blue-500 transition-all mb-8"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setItemToRename(null)}
                className="flex-1 py-4 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-2xl text-zinc-400 font-bold text-sm"
              >
                取消
              </button>
              <button
                onClick={handleUpdateName}
                disabled={!renameValue.trim() || refreshing}
                className="flex-1 py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 transition-all rounded-2xl text-white font-black text-sm shadow-xl shadow-blue-900/20 disabled:opacity-50"
              >
                {refreshing ? '中...' : '確認修改'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelp && (
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
              {/*
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-lg bg-yellow-600/20 flex items-center justify-center text-yellow-400 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                </div>
                <p>點擊 <span className="text-white">星號</span> 收藏作品，只有收藏的項目會被納入 AI 追蹤檢查。</p>
              </div>
              <div className="flex gap-3 items-center">
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center text-purple-400 shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M12 2v8M12 14v8M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h8M14 12h8M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path></svg>
                </div>
                <p>點擊右上角 <span className="text-white">紫色 AI 按鈕</span>，自動檢查全網最新集數並顯示紅色呼吸燈。</p>
              </div>
              */}
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
              onClick={() => setShowHelp(false)}
              className="mt-8 w-full py-4 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-2xl text-white font-bold text-xs shadow-xl"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {refreshing && list.length === 0 ? (
          <div className="flex items-center justify-center py-20 animate-pulse">
            <div className="text-zinc-600 font-bold uppercase tracking-widest text-xs">同步數據中...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {list.map((item) => (
              <div
                key={item.rowNumber}
                className="group relative overflow-hidden p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/40 backdrop-blur-sm transition-all hover:bg-zinc-900 hover:border-zinc-700/50 shadow-xl"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 group/name">
                      <div
                        onClick={() => toggleExpand(item.rowNumber)}
                        className={`text-[17px] font-black leading-tight text-white flex-1 flex items-center gap-2 cursor-pointer select-none active:opacity-70 transition-opacity ${expandedItems[item.rowNumber] ? '' : 'min-w-0'}`}
                        title={item.name}
                      >
                        <span className={expandedItems[item.rowNumber] ? 'break-words' : 'truncate'}>{item.name}</span>
                        {/* AI Red Dot Hidden
                      {hasNewEpisode(item.latest, item.progress) && (
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)] animate-pulse shrink-0 border-2 border-zinc-900"></span>
                      )}
                      */}
                      </div>
                      {/* Star Button Hidden
                    <button
                      onClick={() => handleToggleFavorite(item)}
                      className={`p-1 transition-all shrink-0 active:scale-90 ${item.favorite ? 'text-yellow-400' : 'text-zinc-700 hover:text-zinc-500'}`}
                      title={item.favorite ? "取消追蹤" : "加入追蹤並開啟 AI 檢查"}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill={item.favorite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                      </svg>
                    </button>
                    */}
                      <button
                        onClick={() => {
                          setItemToRename(item);
                          setRenameValue(item.name);
                        }}
                        className="p-1 px-1.5 text-zinc-500 hover:text-blue-400 transition-all shrink-0 active:scale-90"
                        title="修改名稱"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="flex items-center gap-1.5 text-[9px] text-zinc-500 font-bold uppercase tracking-wider bg-zinc-800/30 px-2 py-1 rounded-lg">
                        <span className="w-1 h-1 rounded-full bg-blue-500/40"></span>
                        {item.date ? (item.date.includes('T') ? new Date(item.date).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/') : item.date) : '未知'}
                      </div>
                      {/* Latest Info Hidden
                    {item.latest ? (
                      hasNewEpisode(item.latest, item.progress) ? (
                        <div className="px-2 py-1 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          <span className="text-[9px] text-red-400 font-black uppercase tracking-tight">
                            發現更新: {item.latest}
                          </span>
                        </div>
                      ) : (
                        <div className="px-2 py-1 rounded-lg bg-zinc-800/40 border border-zinc-700/30 flex items-center gap-1.5">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">
                            最新: {item.latest}
                          </span>
                        </div>
                      )
                    ) : null}
                    */}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-black/50 rounded-xl p-0.5 border border-zinc-800 group-hover:border-blue-500/20 transition-all">
                      {/^\d+$/.test(item.progress) && (
                        <button
                          onClick={() => handleDecrement(item)}
                          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white active:scale-75 transition-all"
                          aria-label="減少"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                      )}
                      <div className="flex flex-col items-center px-1">
                        <span className="text-[6px] font-black text-blue-500/50 uppercase tracking-[0.2em] mb-0">
                          {/^\d+$/.test(item.progress) ? '集數' : '狀態'}
                        </span>
                        <input
                          type="text"
                          value={item.progress}
                          onChange={(e) => handleInputChange(item, e.target.value)}
                          onBlur={() => handleInputBlur(item)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.currentTarget as HTMLInputElement).blur()}
                          className={`${/^\d+$/.test(item.progress) ? 'w-8' : 'min-w-[40px] max-w-[105px] px-0.5'} bg-transparent text-blue-500 text-center font-black text-base focus:outline-none transition-all`}
                        />
                      </div>
                      {/^\d+$/.test(item.progress) && (
                        <button
                          onClick={() => handleIncrement(item)}
                          className="w-8 h-8 flex items-center justify-center text-blue-500 hover:text-blue-400 active:scale-75 transition-all"
                          aria-label="增加"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        </button>
                      )}
                    </div>

                    <button
                      onClick={() => setItemToDelete(item)}
                      className="p-2 text-red-500/40 hover:text-red-500 active:scale-90 transition-all"
                      title="刪除項次"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Centered Loading Overlay for initial data fetch or manual refresh */}
        {refreshing && list.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32 px-6 animate-in fade-in duration-500">
            <div className="w-12 h-12 border-2 border-zinc-800 border-t-blue-500 rounded-full animate-spin mb-6" />
            <div className="text-center space-y-2">
              <span className="block text-zinc-400 font-black text-lg tracking-tight">同步數據中...</span>
              <span className="block text-zinc-600 font-bold text-[10px] uppercase tracking-[0.2em]">請稍候，正在連線至 Google Sheets</span>
            </div>
          </div>
        )}

        {list.length === 0 && !refreshing && (
          <div className="flex flex-col items-center justify-center py-32 px-6 animate-in zoom-in-95 duration-700">
            <button
              onClick={() => setShowAddItem(true)}
              className="group relative flex flex-col items-center gap-6 active:scale-95 transition-all duration-300"
            >
              <div className="w-24 h-24 rounded-[32px] bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-blue-500 group-hover:border-blue-500/30 group-hover:bg-blue-500/5 transition-all duration-500 shadow-2xl group-hover:shadow-blue-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>

                {/* Animated rings */}
                <div className="absolute inset-0 rounded-[32px] border border-blue-500/0 group-hover:border-blue-500/50 group-hover:scale-110 transition-all duration-700 opacity-0 group-hover:opacity-100" />
              </div>

              <div className="text-center space-y-2">
                <span className="block text-zinc-400 font-black text-lg tracking-tight">新增您的第一部動畫</span>
                <span className="block text-zinc-600 font-bold text-[10px] uppercase tracking-[0.2em]">點擊上方按鈕開始追蹤</span>
              </div>
            </button>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteAccount && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300">
            <div className="bg-zinc-900 border border-red-500/20 p-8 rounded-[40px] shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200 text-center">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-red-500 animate-pulse">
                  <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <path d="M10 11v6"></path>
                  <path d="M14 11v6"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-black text-white mb-3">刪除整個帳號？</h3>
              <p className="text-zinc-500 text-sm mb-10 leading-relaxed">
                您確定要刪除帳號 「<span className="text-red-400 font-black">{currentAccount}</span>」 嗎？<br />
                這將會<span className="text-zinc-200 font-bold">永久移除</span> Google Sheets 中該分頁的所有動畫追蹤資料，此動作無法復原。
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleDeleteAccount}
                  disabled={refreshing}
                  className="w-full py-5 bg-red-600 hover:bg-red-500 active:scale-95 transition-all rounded-2xl text-white font-black text-sm shadow-2xl shadow-red-900/40"
                >
                  {refreshing ? '正在永久刪除資料...' : '確認永久刪除帳號'}
                </button>
                <button
                  onClick={() => setShowDeleteAccount(false)}
                  className="w-full py-5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-2xl text-zinc-400 font-bold text-sm"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

