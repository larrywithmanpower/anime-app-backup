'use client';

import { useState, useEffect, useMemo } from 'react';
import { AnimeItem } from '@/types/anime';

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

export function useAnimeList(currentAccount: string, isLoggedIn: boolean) {
  const [list, setList] = useState<AnimeItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [itemToDelete, setItemToDelete] = useState<AnimeItem | null>(null);
  const [itemToRename, setItemToRename] = useState<AnimeItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  // 計算過濾後的清單
  const filteredList = useMemo(() => {
    let result = list;
    if (searchQuery) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (sortBy === 'name') {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'));
    }
    // sortBy === 'date' 保持 GAS 回傳的日期順序
    return result;
  }, [list, searchQuery, sortBy]);

  const fetchData = async (sheetOverride?: string): Promise<AnimeItem[]> => {
    const sheet = sheetOverride || currentAccount;
    if (!sheet || !APPS_SCRIPT_URL) {
      return [];
    }

    setRefreshing(true);
    try {
      const url = `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(sheet)}`;
      const res = await fetch(url);
      const rawData = await res.json();

      // 映射邏輯（從 GAS 原始回應轉換）
      if (Array.isArray(rawData)) {
        const mappedData = rawData
          .slice(1) // 跳過標題列
          .map((row: any[], index: number) => ({
            rowNumber: index + 2,
            date: row[0] || '',
            name: row[1] || '',
            progress: row[2] || '',
            latest: row[3] || '',
            favorite: row[4] === true || row[4] === 'TRUE',
          })).filter((item: AnimeItem) => item.name);
        setList(mappedData);
        return mappedData;
      }
      return [];
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    fetchData();
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
        fetchData();
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
        fetchData();
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

  const handleUpdateName = async () => {
    if (!itemToRename || !renameValue.trim() || !APPS_SCRIPT_URL) return;
    setRefreshing(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        body: JSON.stringify({
          action: 'updateName',
          row: itemToRename.rowNumber,
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
          row: item.rowNumber,
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

    // 先更新本地狀態
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
    // 即時更新本地狀態以保持響應性
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

  const handleDeleteAccount = async (handleLogout: () => void) => {
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
        setList([]);
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

  // 登入狀態改變時自動載入清單
  useEffect(() => {
    if (isLoggedIn && currentAccount) {
      fetchData();
    }
  }, [isLoggedIn, currentAccount]);

  return {
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
    fetchData,
    handleManualRefresh,
    handleAddItem,
    handleDeleteItem,
    handleUpdateName,
    handleProgressUpdate,
    handleIncrement,
    handleDecrement,
    toggleExpand,
    handleToggleFavorite,
    handleInputChange,
    handleInputBlur,
    handleDeleteAccount,
  };
}
