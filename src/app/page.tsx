'use client';

import { useState, useEffect } from 'react';

interface AnimeItem {
  rowNumber: number;
  date: string;
  name: string;
  progress: string;
}

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

export default function AnimeTracker() {
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

  const fetchAccountList = async () => {
    if (!APPS_SCRIPT_URL) return;
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=getSheets`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAccounts(data);
        const saved = localStorage.getItem('lastAccount');
        if (saved && data.includes(saved)) {
          setCurrentAccount(saved);
          setIsLoggedIn(true);
        }
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err);
    } finally {
      setInitializing(false);
    }
  };

  const fetchData = async (sheetOverride?: string) => {
    const sheet = sheetOverride || currentAccount;
    if (!sheet || !APPS_SCRIPT_URL) return;

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
          })).filter(item => item.name);
        setList(mappedData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshing(false);
      setInitializing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchData();
  };

  useEffect(() => {
    fetchAccountList();
  }, []);

  useEffect(() => {
    if (isLoggedIn && currentAccount) {
      fetchData();
    }
  }, [isLoggedIn, currentAccount]);

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
      console.log('Adding item request:', requestBody);
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify(requestBody),
      });
      const result = await res.json();
      console.log('Adding item response:', result);
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
      console.log('Rename payload:', { row: itemToRename.rowNumber, name: renameValue.trim() });
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
      console.log('Rename API Result:', result);
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

  if (initializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-zinc-600 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">系統初始化中...</div>
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
    <main className="min-h-screen bg-black text-white p-3 pb-24 relative overflow-x-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-64 bg-blue-600/10 blur-[100px] -z-10 rounded-full" />

      <header className="mb-8 px-1 flex items-end justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-black tracking-tighter mb-1.5 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent italic leading-none">
            TRACKER
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[10px] font-black tracking-widest">使用者: <span className="text-zinc-300">{currentAccount}</span></span>
            <button
              onClick={handleLogout}
              className="text-[9px] font-black text-red-500/60 hover:text-red-400 uppercase tracking-widest border border-red-500/20 rounded-full px-2 py-0.5 active:scale-90 transition-all"
            >
              登出
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500/60 hover:text-red-500 active:scale-90 transition-all"
            aria-label="刪除此帳號"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
              <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>

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

          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className={`w-9 h-9 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 active:scale-90 transition-all ${refreshing ? 'animate-spin' : ''}`}
            aria-label="重新整理"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </header>

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
          <div className="bg-zinc-900 border border-zinc-800 p-7 rounded-[32px] shadow-2xl w-full max-w-xs animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black mb-5 text-white tracking-tight">操作小技巧</h2>
            <div className="space-y-5 text-zinc-400 text-xs font-medium">
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-lg bg-green-600/20 flex items-center justify-center text-green-400 shrink-0 text-[10px] font-bold">+</div>
                <p>點擊右上角的 <span className="text-white">+ 號</span> 即可在當前帳號下新增新的追蹤項目。</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-lg bg-red-600/20 flex items-center justify-center text-red-400 shrink-0 text-[10px] font-bold">OUT</div>
                <p>點擊頂部的 <span className="text-white">Logout</span> 即可更換登入不同的帳號。</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400 shrink-0 text-[10px] font-bold">+ -</div>
                <p>點擊左右按鈕快速<span className="text-white">增加或減少</span>集數。</p>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-lg bg-green-600/20 flex items-center justify-center text-green-400 shrink-0 text-[10px] font-bold">12</div>
                <p>直接點擊數字區域，<span className="text-white">輸入精確數值</span>後按 Enter 或點空白處保存。</p>
              </div>
            </div>
            <button
              onClick={() => setShowHelp(false)}
              className="mt-8 w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95 transition-all rounded-xl text-white font-bold text-xs shadow-xl"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {refreshing && list.length === 0 ? (
        <div className="flex items-center justify-center py-20 animate-pulse">
          <div className="text-zinc-600 font-bold uppercase tracking-widest text-xs">同步數據中...</div>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <div
              key={item.rowNumber}
              className="group relative overflow-hidden p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/40 backdrop-blur-sm transition-all hover:bg-zinc-900 hover:border-zinc-700/50 shadow-xl"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 group/name">
                    <div className="text-[15px] font-bold leading-tight text-zinc-100 break-words flex-1">
                      {item.name}
                    </div>
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
                  <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40"></span>
                    {item.date ? (item.date.includes('T') ? new Date(item.date).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '/') : item.date) : '未知'}
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

      {list.length === 0 && (
        <div className="flex flex-col items-center justify-center py-32 px-6">
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
    </main>
  );
}

