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

function MoonMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M 12 3 A 9 9 0 1 0 12 21 A 6.5 6.5 0 1 1 12 3 Z"
        fill="currentColor"
      />
      <circle cx="19" cy="5" r="0.9" fill="currentColor" opacity="0.8" />
      <circle cx="21.5" cy="9" r="0.55" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

function SkeletonCard() {
  return (
    <div className="relative overflow-hidden rounded-[16px] border border-ink-border bg-ink-deep/60 p-4 pl-[18px]">
      <div className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-ink-border-strong" />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="h-4 w-3/4 animate-pulse rounded bg-ink-mist" />
          <div className="h-2.5 w-1/3 animate-pulse rounded bg-ink-mist/60" />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="h-10 w-[90px] animate-pulse rounded-xl bg-ink-mist" />
          <div className="h-6 w-6 animate-pulse rounded bg-ink-mist/80" />
        </div>
      </div>
    </div>
  );
}

export default function AnimeTracker() {
  const [hasMounted, setHasMounted] = useState(false);

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

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return null;

  if (initializing) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-black p-6 text-center">
        <div className="moon-breath mb-5 text-moon">
          <MoonMark className="h-8 w-8" />
        </div>
        <p className="font-display text-[11px] uppercase tracking-[0.35em] text-mist-silver">
          星圖校準中
        </p>
        {!process.env.NEXT_PUBLIC_APPS_SCRIPT_URL && (
          <div className="mt-10 max-w-xs rounded-[18px] border border-cinnabar/25 bg-cinnabar/8 p-5">
            <p className="mb-2 font-display text-xs font-bold text-cinnabar">設定錯誤</p>
            <p className="text-[10px] leading-relaxed text-mist-silver">
              請檢查 .env.local 是否已正確設定 NEXT_PUBLIC_APPS_SCRIPT_URL
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
    <main className="relative min-h-screen overflow-x-hidden pb-24 pt-[calc(env(safe-area-inset-top)+9.5rem)] text-mist">
      {/* 固定頂部導覽列 */}
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-ink-border bg-ink-black/82 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur-2xl">
        {/* 頂部極細金光 */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-moon/50 to-transparent" />

        <div className="mx-auto flex max-w-7xl items-start justify-between px-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="text-moon">
                <MoonMark className="h-[18px] w-[18px]" />
              </span>
              <h1 className="font-display text-[22px] font-bold leading-none tracking-[0.14em] text-mist sm:text-[26px]">
                TRACKER
              </h1>
            </div>

            <div className="mt-3 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="font-display text-[10px] uppercase leading-none tracking-[0.3em] text-mist-silver">
                  航者
                </span>
                <button
                  onClick={() => setShowDeleteAccount(true)}
                  className="text-[9px] uppercase tracking-[0.28em] text-cinnabar/90 transition-all hover:text-cinnabar active:scale-95"
                >
                  註銷
                </button>
              </div>

              <div className="font-display px-0.5 text-[18px] font-bold leading-none tracking-tight text-mist">
                {currentAccount}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2.5">
            <button
              onClick={handleLogout}
              className="font-display text-[11px] uppercase tracking-[0.3em] text-star transition-all hover:text-mist active:scale-95"
            >
              登 出
            </button>

            <div className="flex gap-1.5">
              <button
                onClick={() => setShowAddItem(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-border bg-ink-deep/80 text-mist-silver transition-all hover:border-moon/50 hover:bg-moon/10 hover:text-moon active:scale-90"
                aria-label="新增項目"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              <button
                onClick={() => setShowHelp(true)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-ink-border bg-ink-deep/80 text-mist-silver transition-all hover:border-star/50 hover:bg-star/10 hover:text-star active:scale-90"
                aria-label="使用說明"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>

              <button
                onClick={handleManualRefresh}
                disabled={refreshing}
                className={`group flex h-9 w-9 items-center justify-center rounded-xl border transition-all active:scale-90 ${
                  refreshing
                    ? 'border-star/55 bg-star/12 text-star'
                    : 'border-ink-border bg-ink-deep/80 text-mist-silver hover:border-star/50 hover:bg-star/10 hover:text-star'
                }`}
                aria-label="重新整理"
                title="同步雲端數據"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-4 w-4 transition-transform duration-500 ${
                    refreshing ? 'animate-spin' : 'group-hover:rotate-180'
                  }`}
                >
                  <path d="M23 4v6h-6" />
                  <path d="M1 20v-6h6" />
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* 搜尋與排序 */}
        <div className="mx-auto mt-3 flex max-w-7xl items-center gap-2 px-4 sm:px-6">
          <div className="relative flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-mist-shadow"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="搜尋作品…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-ink-border bg-ink-deep/70 py-2 pl-9 pr-9 text-[13px] font-medium text-mist placeholder:text-mist-shadow focus:border-moon/60 focus:outline-none transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-mist-shadow transition-colors hover:text-mist"
                aria-label="清除搜尋"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => setSortBy(sortBy === 'name' ? 'date' : 'name')}
            className={`font-display shrink-0 rounded-xl border px-3.5 py-2 text-[12px] font-bold tracking-[0.15em] transition-all ${
              sortBy === 'name'
                ? 'border-moon/55 bg-moon/12 text-moon'
                : 'border-ink-border bg-ink-deep/70 text-mist-silver hover:text-mist'
            }`}
            title="切換排序方式"
          >
            {sortBy === 'name' ? '名稱' : '日期'}
          </button>
        </div>
      </header>

      {/* Modals */}
      {showAddItem && (
        <AddItemModal
          newItemName={newItemName}
          refreshing={refreshing}
          onNameChange={setNewItemName}
          onAdd={handleAddItem}
          onClose={() => setShowAddItem(false)}
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

      {itemToRename && (
        <RenameModal
          renameValue={renameValue}
          refreshing={refreshing}
          onValueChange={setRenameValue}
          onConfirm={handleUpdateName}
          onClose={() => setItemToRename(null)}
        />
      )}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {refreshing && list.length === 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <>
            {list.length > 0 && (
              <div className="grid-stagger grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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

            {!refreshing && searchQuery && filteredList.length === 0 && list.length > 0 && (
              <div className="star-rise flex flex-col items-center justify-center py-24 text-center">
                <div className="mb-4 text-mist-shadow">
                  <MoonMark className="h-7 w-7" />
                </div>
                <p className="font-display mb-1.5 text-[15px] text-mist-silver">
                  星海無蹤
                </p>
                <p className="text-[11px] tracking-wider text-mist-shadow">
                  「{searchQuery}」 未在此帳下
                </p>
              </div>
            )}

            {!refreshing && list.length === 0 && (
              <div className="star-rise flex flex-col items-center justify-center px-6 py-28">
                <button
                  onClick={() => setShowAddItem(true)}
                  className="group relative flex flex-col items-center gap-7 transition-all duration-300 active:scale-[0.98]"
                >
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-ink-border-strong bg-ink-deep/60 text-mist-shadow transition-all duration-700 group-hover:border-moon/60 group-hover:text-moon group-hover:shadow-[0_0_70px_-14px_var(--moon-glow)]">
                    <MoonMark className="h-10 w-10" />
                    <div className="absolute inset-0 scale-100 rounded-full border border-moon/0 transition-all duration-700 group-hover:scale-125 group-hover:border-moon/35" />
                    <div className="absolute inset-0 scale-100 rounded-full border border-moon/0 transition-all duration-[1200ms] group-hover:scale-150 group-hover:border-moon/18" />
                  </div>

                  <div className="space-y-2 text-center">
                    <span className="font-display block text-[18px] font-bold tracking-wide text-mist">
                      夜未央，且記初章
                    </span>
                    <span className="block text-[10px] uppercase tracking-[0.3em] text-mist-shadow">
                      Tap to add your first voyage
                    </span>
                  </div>
                </button>
              </div>
            )}
          </>
        )}

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
