'use client';

import { useState } from 'react';
import { useAccounts } from '@/hooks/useAccounts';
import { useAnimeList } from '@/hooks/useAnimeList';
import { WATCH_STATUSES } from '@/types/anime';
import AnimeCard from '@/components/AnimeCard';
import LoginScreen from '@/components/LoginScreen';
import AddItemModal from '@/components/AddItemModal';
import DeleteConfirmModal from '@/components/DeleteConfirmModal';
import EditItemModal from '@/components/EditItemModal';
import SettingsModal from '@/components/SettingsModal';
import HelpModal from '@/components/HelpModal';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import ToastStack from '@/components/ToastStack';

function SkeletonCard() {
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-surface p-3">
      <div className="h-[74px] w-[52px] shrink-0 animate-pulse rounded-md bg-surface-hi" />
      <div className="flex flex-1 flex-col justify-between gap-3 py-1">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-surface-hi" />
        <div className="h-1 w-full animate-pulse rounded bg-surface-hi" />
        <div className="h-8 w-2/5 animate-pulse self-end rounded bg-surface-hi" />
      </div>
    </div>
  );
}

export default function AnimeTracker() {
  const [searchOpen, setSearchOpen] = useState(false);

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

  const animeList = useAnimeList(currentAccount, isLoggedIn);
  const {
    list,
    refreshing,
    showAddItem,
    itemToDelete,
    itemToEdit,
    showHelp,
    showSettings,
    showDeleteAccount,
    searchQuery,
    sortBy,
    statusFilter,
    statusCounts,
    filteredList,
    toasts,
    setShowAddItem,
    setItemToDelete,
    setItemToEdit,
    setShowHelp,
    setShowSettings,
    setShowDeleteAccount,
    setSearchQuery,
    setSortBy,
    setStatusFilter,
    dismissToast,
    handleManualRefresh,
    handleAddItem,
    handleDeleteItem,
    handleUpdateMeta,
    handleSetStatus,
    handleIncrement,
    handleDecrement,
    handleInputChange,
    handleInputBlur,
  } = animeList;

  // initializing 初始為 true，SSR 與首次 client render 都是載入畫面，不會 hydration mismatch
  if (initializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-bg p-6 text-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-accent" />
        <p className="mt-4 text-[13px] text-faint">載入中</p>
        {!process.env.NEXT_PUBLIC_APPS_SCRIPT_URL && (
          <div className="mt-8 max-w-xs rounded-xl border border-danger/30 bg-danger/10 p-4">
            <p className="mb-1 text-[13px] font-semibold text-danger">設定錯誤</p>
            <p className="text-[11px] leading-relaxed text-dim">
              請檢查 .env.local 是否已設定 NEXT_PUBLIC_APPS_SCRIPT_URL
            </p>
          </div>
        )}
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <LoginScreen
        loginName={loginName}
        loginError={loginError}
        verifying={verifying}
        showCreateAccount={showCreateAccount}
        onLoginNameChange={setLoginName}
        onLoginErrorChange={setLoginError}
        onLogin={handleLogin}
        onShowCreateAccount={setShowCreateAccount}
        onCreateAccount={handleCreateAccount}
      />
    );
  }

  const searching = searchQuery.trim().length > 0;

  return (
    <main className="relative min-h-screen pb-16 pt-[calc(env(safe-area-inset-top)+6.5rem)] text-text">
      <header className="fixed left-0 right-0 top-0 z-40 border-b border-line bg-bg/90 pt-[calc(env(safe-area-inset-top)+0.75rem)] backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4">
          {/* 第一行：標題 + 全域動作 */}
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-bold tracking-tight">追番進度</h1>
            <span className="truncate text-[12px] text-faint">{currentAccount}</span>

            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-dim transition-colors hover:bg-surface hover:text-text disabled:opacity-50"
                aria-label="同步雲端資料"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}>
                  <path d="M21 2v6h-6M3 22v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L21 8M21 15a9 9 0 0 1-14.85 3.36L3 16" />
                </svg>
              </button>

              <button
                onClick={() => setShowSettings(true)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-dim transition-colors hover:bg-surface hover:text-text"
                aria-label="設定"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>

              <button
                onClick={() => setShowAddItem(true)}
                className="flex h-8 items-center gap-1 rounded-lg bg-accent px-3 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hi active:scale-95"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="h-3.5 w-3.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                新增
              </button>
            </div>
          </div>

          {/* 第二行：狀態篩選；搜尋收在圖示後面，避免常駐佔掉一整行 */}
          <div className="mt-2.5 flex items-center gap-2 pb-2.5">
            {searchOpen || searching ? (
              <>
                <input
                  autoFocus
                  type="text"
                  placeholder="搜尋全部作品…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="h-8 flex-1 rounded-lg border border-line bg-surface px-3 text-[13px] text-text placeholder:text-faint focus:border-line-hi focus:outline-none"
                />
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className="shrink-0 px-1 text-[13px] text-dim transition-colors hover:text-text"
                >
                  取消
                </button>
              </>
            ) : (
              <>
                <div className="scroll-thin -mx-1 flex flex-1 gap-1 overflow-x-auto px-1">
                  {WATCH_STATUSES.map(s => (
                    <button
                      key={s.key}
                      onClick={() => setStatusFilter(s.key)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
                        statusFilter === s.key
                          ? 'bg-surface-hi font-semibold text-text'
                          : 'text-dim hover:bg-surface hover:text-text'
                      }`}
                    >
                      {s.label}
                      <span className="tnum text-[11px] text-faint">{statusCounts[s.key]}</span>
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setSortBy(sortBy === 'name' ? 'date' : 'name')}
                  className="shrink-0 rounded-lg px-2 py-1.5 text-[12px] text-dim transition-colors hover:bg-surface hover:text-text"
                  title="切換排序：日期 / 名稱"
                >
                  {sortBy === 'name' ? '名稱↓' : '日期↓'}
                </button>

                <button
                  onClick={() => setSearchOpen(true)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-dim transition-colors hover:bg-surface hover:text-text"
                  aria-label="搜尋"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4">
        {searching && (
          <p className="mb-3 text-[12px] text-faint">
            搜尋結果（跨全部狀態）· {filteredList.length} 筆
          </p>
        )}

        {refreshing && list.length === 0 ? (
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            {filteredList.length > 0 && (
              <div className="stagger grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
                {filteredList.map(item => (
                  <AnimeCard
                    key={item.rowNumber}
                    item={item}
                    onIncrement={handleIncrement}
                    onDecrement={handleDecrement}
                    onInputChange={handleInputChange}
                    onInputBlur={handleInputBlur}
                    onEdit={setItemToEdit}
                    onSetStatus={handleSetStatus}
                  />
                ))}
              </div>
            )}

            {filteredList.length === 0 && (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                {searching ? (
                  <p className="text-[13px] text-dim">
                    找不到「{searchQuery}」
                  </p>
                ) : list.length === 0 ? (
                  <>
                    <p className="mb-1 text-[15px] font-semibold text-text">還沒有任何作品</p>
                    <p className="mb-5 text-[12px] text-faint">新增時可以搜尋，會自動帶封面與總集數</p>
                    <button
                      onClick={() => setShowAddItem(true)}
                      className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent-hi"
                    >
                      新增第一部
                    </button>
                  </>
                ) : (
                  <p className="text-[13px] text-dim">
                    「{WATCH_STATUSES.find(s => s.key === statusFilter)?.label}」目前沒有作品
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showAddItem && (
        <AddItemModal
          refreshing={refreshing}
          onAdd={handleAddItem}
          onClose={() => setShowAddItem(false)}
        />
      )}

      {itemToEdit && (
        <EditItemModal
          item={itemToEdit}
          onSave={handleUpdateMeta}
          onDelete={item => {
            setItemToEdit(null);
            setItemToDelete(item);
          }}
          onClose={() => setItemToEdit(null)}
        />
      )}

      {itemToDelete && (
        <DeleteConfirmModal
          item={itemToDelete}
          refreshing={refreshing}
          onConfirm={handleDeleteItem}
          onClose={() => setItemToDelete(null)}
        />
      )}

      {showSettings && (
        <SettingsModal
          currentAccount={currentAccount}
          onLogout={handleLogout}
          onDeleteAccount={() => {
            setShowSettings(false);
            setShowDeleteAccount(true);
          }}
          onShowHelp={() => {
            setShowSettings(false);
            setShowHelp(true);
          }}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {showDeleteAccount && (
        <DeleteAccountModal
          currentAccount={currentAccount}
          refreshing={refreshing}
          onConfirm={() => animeList.handleDeleteAccount(handleLogout)}
          onClose={() => setShowDeleteAccount(false)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
