'use client';

import { useState, useEffect } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useAnimeList } from '@/hooks/useAnimeList';
import AnimeCard from '@/components/AnimeCard';
import LoginScreen from '@/components/LoginScreen';
import AddItemModal from '@/components/AddItemModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import RenameModal from '@/components/RenameModal';
import HelpModal from '@/components/HelpModal';
import DeleteAccountModal from '@/components/DeleteAccountModal';

// 骨架載入卡片
function SkeletonCard() {
  return (
    <div className="relative overflow-hidden p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          <div className="h-5 bg-zinc-800 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-zinc-800/60 rounded animate-pulse w-1/3" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-24 h-9 bg-zinc-800 rounded-xl animate-pulse" />
          <div className="w-8 h-8 bg-zinc-800 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function AnimeTracker() {
  const [hasMounted, setHasMounted] = useState(false);

  // 帳號管理 Hook
  const accounts = useAccounts();
  const {
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
  } = accounts;

  // 動畫清單管理 Hook
  const animeList = useAnimeList(currentAccount, isLoggedIn);
  const {
    list,
    refreshing,
    showAddItem,
    newItemName,
    itemToDelete,
    itemToRename,
    renameValue,
    showHelp,
    showDeleteAccount,
    expandedItems,
    searchQuery,
    sortBy,
    filteredList,
    setShowAddItem,
    setNewItemName,
    setItemToDelete,
    setItemToRename,
    setRenameValue,
    setShowHelp,
    setShowDeleteAccount,
    setSearchQuery,
    setSortBy,
    handleManualRefresh,
    handleAddItem,
    handleDeleteItem,
    handleUpdateName,
    handleIncrement,
    handleDecrement,
    toggleExpand,
    handleInputChange,
    handleInputBlur,
  } = animeList;

  // SSR 安全掛載確認
  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  // 初始化中畫面
  if (initializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-6 text-center">
        <div className="w-8 h-8 border-2 border-zinc-800 border-t-white rounded-full animate-spin mb-4" />
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em]">系統初始化中...</p>
        {!process.env.NEXT_PUBLIC_APPS_SCRIPT_URL && (
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

  // 登入畫面
  if (!isLoggedIn) {
    return (
      <LoginScreen
        loginName={loginName}
        loginError={loginError}
        verifying={verifying}
        showCreateAccount={showCreateAccount}
        refreshing={refreshing}
        onLoginNameChange={setLoginName}
        onLoginErrorChange={setLoginError}
        onLogin={handleLogin}
        onShowCreateAccount={setShowCreateAccount}
        onCreateAccount={handleCreateAccount}
      />
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pt-[calc(env(safe-area-inset-top)+9rem)] pb-24 relative overflow-x-hidden">
      {/* 背景裝飾 */}
      <div className="absolute top-0 left-0 right-0 h-64 bg-blue-600/10 blur-[100px] -z-10 rounded-full" />

      {/* 固定頂部導覽列 */}
      <header className="fixed top-0 left-0 right-0 z-50 pt-[calc(env(safe-area-inset-top)+1rem)] pb-2 bg-black/85 backdrop-blur-xl border-b border-white/5 shadow-lg shadow-black/50">
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

              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
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

        {/* 搜尋與排序列 */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3 pb-1 flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜尋動畫..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-2 text-white text-sm font-medium focus:outline-none focus:border-blue-500 transition-all placeholder:text-zinc-600"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white">✕</button>
            )}
          </div>
          <button
            onClick={() => setSortBy(sortBy === 'name' ? 'date' : 'name')}
            className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-bold transition-all ${sortBy === 'name' ? 'bg-blue-600/20 border-blue-500/40 text-blue-400' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
          >
            {sortBy === 'name' ? '名稱' : '日期'}
          </button>
        </div>
      </header>

      {/* 新增動畫 Modal */}
      {showAddItem && (
        <AddItemModal
          newItemName={newItemName}
          refreshing={refreshing}
          onNameChange={setNewItemName}
          onAdd={handleAddItem}
          onClose={() => setShowAddItem(false)}
        />
      )}

      {/* 刪除確認 Modal */}
      {itemToDelete && (
        <DeleteConfirmModal
          item={itemToDelete}
          refreshing={refreshing}
          onConfirm={handleDeleteItem}
          onClose={() => setItemToDelete(null)}
        />
      )}

      {/* 改名 Modal */}
      {itemToRename && (
        <RenameModal
          renameValue={renameValue}
          refreshing={refreshing}
          onValueChange={setRenameValue}
          onConfirm={handleUpdateName}
          onClose={() => setItemToRename(null)}
        />
      )}

      {/* 說明 Modal */}
      {showHelp && (
        <HelpModal onClose={() => setShowHelp(false)} />
      )}

      {/* 主內容區 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* 骨架載入：無資料且正在重新整理 */}
        {refreshing && list.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            {/* 動畫清單 */}
            {list.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredList.map((item) => (
                  <AnimeCard
                    key={item.rowNumber}
                    item={item}
                    isExpanded={expandedItems[item.rowNumber] ?? false}
                    onToggleExpand={toggleExpand}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                    onInputChange={handleInputChange}
                    onInputBlur={handleInputBlur}
                    onDelete={setItemToDelete}
                    onRename={(item) => {
                      setItemToRename(item);
                      setRenameValue(item.name);
                    }}
                  />
                ))}
              </div>
            )}

            {/* 搜尋無結果提示 */}
            {!refreshing && searchQuery && filteredList.length === 0 && list.length > 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-300">
                <p className="text-zinc-500 font-bold text-sm mb-1">找不到相符的動畫</p>
                <p className="text-zinc-700 text-xs">「{searchQuery}」 沒有任何結果</p>
              </div>
            )}

            {/* 空清單提示 */}
            {!refreshing && list.length === 0 && (
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
                    <div className="absolute inset-0 rounded-[32px] border border-blue-500/0 group-hover:border-blue-500/50 group-hover:scale-110 transition-all duration-700 opacity-0 group-hover:opacity-100" />
                  </div>

                  <div className="text-center space-y-2">
                    <span className="block text-zinc-400 font-black text-lg tracking-tight">新增您的第一部動畫</span>
                    <span className="block text-zinc-600 font-bold text-[10px] uppercase tracking-[0.2em]">點擊上方按鈕開始追蹤</span>
                  </div>
                </button>
              </div>
            )}
          </>
        )}

        {/* 刪除帳號確認 Modal */}
        {showDeleteAccount && (
          <DeleteAccountModal
            currentAccount={currentAccount}
            refreshing={refreshing}
            onConfirm={() => animeList.handleDeleteAccount(handleLogout)}
            onClose={() => setShowDeleteAccount(false)}
          />
        )}
      </div>
    </main>
  );
}
