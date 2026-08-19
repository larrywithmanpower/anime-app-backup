'use client';

import { useState, useEffect, useRef } from 'react';
import {
  AnimeItem,
  WatchStatus,
  WATCH_STATUSES,
  parseStatus,
  parseTotalEpisodes,
} from '@/types/anime';

import { APPS_SCRIPT_URL, gasGet, gasPost } from '@/lib/gas';

/** +/- 連按時的合併視窗；一列只會送出最後一次的值 */
const PROGRESS_DEBOUNCE_MS = 500;

const cacheKey = (account: string) => `animeCache:${account}`;

export interface Toast {
  id: number;
  message: string;
  tone: 'error' | 'success';
}

/** 新增 / 編輯時可帶的欄位 */
export interface ItemDraft {
  name: string;
  progress?: string;
  totalEpisodes?: string;
  status?: WatchStatus;
  watchUrl?: string;
  coverImage?: string;
  bangumiId?: string;
  category?: string;
  tvmazeId?: string;
  nextEpisodeDate?: string;
  nextEpisodeLabel?: string;
}

// 將日期字串轉成毫秒；無效或空值回傳 0（排到最後）
const parseDate = (raw: string): number => {
  if (!raw) return 0;
  const t = new Date(raw.includes('T') ? raw : raw.replace(/\//g, '-')).getTime();
  return Number.isNaN(t) ? 0 : t;
};

// 依排序模式產生 rowNumber 排列順序
const computeOrder = (items: AnimeItem[], by: 'date' | 'name'): number[] => {
  const sorted = [...items].sort(
    by === 'name'
      ? (a, b) => a.name.localeCompare(b.name, 'zh-TW')
      : (a, b) => parseDate(b.date) - parseDate(a.date)
  );
  return sorted.map(i => i.rowNumber);
};

// GAS 回傳的原始列 → AnimeItem；D / E 欄可能殘留舊 AI 資料，一律寬鬆解析
const mapRows = (rows: unknown[][]): AnimeItem[] =>
  rows
    .slice(1) // 跳過標題列
    .map((row, index) => ({
      rowNumber: index + 2,
      date: String(row[0] ?? ''),
      name: String(row[1] ?? ''),
      progress: String(row[2] ?? ''),
      totalEpisodes: parseTotalEpisodes(row[3]),
      status: parseStatus(row[4]),
      watchUrl: String(row[5] ?? ''),
      coverImage: String(row[6] ?? ''),
      bangumiId: String(row[7] ?? ''),
      category: String(row[8] ?? ''),
      tvmazeId: String(row[9] ?? ''),
      nextEpisodeDate: parseAirdate(row[10]),
      nextEpisodeLabel: String(row[11] ?? ''),
    }))
    .filter(item => item.name);

/**
 * 播出日一律正規化成 YYYY-MM-DD。
 *
 * K 欄已設成純文字，正常會直接拿到 `2026-08-22`；但舊資料或手動改過的格子可能被
 * Sheets 認成日期，JSON 化後是 UTC 的 ISO 字串（`2026-08-21T16:00:00.000Z`），
 * 直接截前 10 碼會整整差一天，必須換回台北時區。
 */
const parseAirdate = (raw: unknown): string => {
  const value = String(raw ?? '').trim();
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ''
    : parsed.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
};

const todayLabel = () =>
  new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });

export function useAnimeList(currentAccount: string, isLoggedIn: boolean) {
  const [list, setList] = useState<AnimeItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<AnimeItem | null>(null);
  const [itemToEdit, setItemToEdit] = useState<AnimeItem | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortByState] = useState<'date' | 'name'>('date');
  const [statusFilter, setStatusFilter] = useState<WatchStatus>('watching');
  const [toasts, setToasts] = useState<Toast[]>([]);
  // 顯示順序快照；只在載入清單或切換排序時更新，避免進度即時編輯造成跳位
  const [displayOrder, setDisplayOrder] = useState<number[]>([]);

  // 紀錄各列已存檔的進度，blur 時用來判斷是否真的有修改
  const committedProgressRef = useRef<Map<number, string>>(new Map());
  // 尚未送出的進度（debounce 中），切帳號或關頁前要 flush
  const pendingProgressRef = useRef<Map<number, string>>(new Map());
  const progressTimersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const toastIdRef = useRef(0);

  const pushToast = (message: string, tone: Toast['tone'] = 'error') => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3600);
  };

  const dismissToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const setSortBy = (next: 'date' | 'name') => {
    setSortByState(next);
    setDisplayOrder(computeOrder(list, next));
  };

  // 各狀態的數量，供篩選列顯示
  const statusCounts = WATCH_STATUSES.reduce<Record<WatchStatus, number>>((acc, s) => {
    acc[s.key] = list.filter(i => i.status === s.key).length;
    return acc;
  }, {} as Record<WatchStatus, number>);

  // 搜尋時跨狀態找（不然搜已完結的作品會找不到）；沒搜尋才套用狀態篩選
  const filteredList = (() => {
    const keyword = searchQuery.trim().toLowerCase();
    const result = keyword
      ? list.filter(item => item.name.toLowerCase().includes(keyword))
      : list.filter(item => item.status === statusFilter);

    const orderMap = new Map(displayOrder.map((row, idx) => [row, idx]));
    return [...result].sort((a, b) => {
      const ia = orderMap.get(a.rowNumber);
      const ib = orderMap.get(b.rowNumber);
      return (ia ?? Infinity) - (ib ?? Infinity);
    });
  })();

  const applyList = (items: AnimeItem[], sheet: string) => {
    setList(items);
    setDisplayOrder(computeOrder(items, sortBy));
    committedProgressRef.current = new Map(items.map(i => [i.rowNumber, i.progress]));
    try {
      localStorage.setItem(cacheKey(sheet), JSON.stringify(items));
    } catch {
      // 快取寫入失敗（例如無痕模式配額）不影響主流程
    }
  };

  const fetchData = async (sheetOverride?: string): Promise<AnimeItem[]> => {
    const sheet = sheetOverride || currentAccount;
    if (!sheet || !APPS_SCRIPT_URL) return [];

    setRefreshing(true);
    try {
      const rawData = await gasGet<unknown>({ sheet }, Array.isArray);

      if (Array.isArray(rawData)) {
        const mapped = mapRows(rawData as unknown[][]);
        applyList(mapped, sheet);
        return mapped;
      }

      const reason = (rawData as { error?: string })?.error;
      pushToast(reason ? `讀取失敗：${reason}` : '讀取失敗，回應格式不正確');
      return [];
    } catch (err) {
      console.error(err);
      pushToast('連線失敗，顯示的是上次同步的內容');
      return [];
    } finally {
      setRefreshing(false);
    }
  };

  const postAction = (body: Record<string, unknown>) => gasPost(body);

  const handleManualRefresh = () => {
    fetchData();
  };

  const handleAddItem = async (draft: ItemDraft) => {
    if (!draft.name.trim() || !APPS_SCRIPT_URL) return false;
    setRefreshing(true);
    try {
      await postAction({
        action: 'addItem',
        sheet: currentAccount,
        name: draft.name.trim(),
        progress: draft.progress ?? '0',
        totalEpisodes: draft.totalEpisodes ?? '',
        status: draft.status ?? 'watching',
        watchUrl: draft.watchUrl ?? '',
        coverImage: draft.coverImage ?? '',
        bangumiId: draft.bangumiId ?? '',
        category: draft.category ?? '',
        tvmazeId: draft.tvmazeId ?? '',
        nextEpisodeDate: draft.nextEpisodeDate ?? '',
        nextEpisodeLabel: draft.nextEpisodeLabel ?? '',
      });
      setShowAddItem(false);
      // 需要拿到 Sheet 實際列號才能後續更新，因此新增後重抓
      await fetchData();
      pushToast(`已加入「${draft.name.trim()}」`, 'success');
      return true;
    } catch (err) {
      console.error('Failed to add item:', err);

      // exec 端點會間歇性回 404、連線也可能逾時，但後端其實已經寫進去了。
      // 直接報失敗會誘使使用者再按一次，清單裡就多出一筆一模一樣的（實測發生過）。
      // 所以回頭讀一次真實狀態再決定要不要說失敗
      const items = await fetchData();
      const name = draft.name.trim();
      if (items.some(item => item.name.trim() === name)) {
        setShowAddItem(false);
        pushToast(`已加入「${name}」`, 'success');
        return true;
      }

      pushToast(`新增失敗：${(err as Error).message}`);
      return false;
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteItem = async (item: AnimeItem) => {
    if (!APPS_SCRIPT_URL) return;
    setRefreshing(true);
    try {
      await postAction({ action: 'deleteItem', sheet: currentAccount, row: item.rowNumber });
      setItemToDelete(null);
      // 刪除會讓後面所有列號往前位移，必須重抓才能維持定位正確
      await fetchData();
      pushToast(`已刪除「${item.name}」`, 'success');
    } catch (err) {
      console.error('Failed to delete item:', err);
      pushToast(`刪除失敗：${(err as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  };

  /** 編輯 modal 送出：名稱 / 總集數 / 狀態 / 連結 / 類型 */
  const handleUpdateMeta = async (item: AnimeItem, draft: ItemDraft) => {
    if (!APPS_SCRIPT_URL) return false;

    const patch = {
      name: draft.name.trim(),
      progress: draft.progress ?? item.progress,
      totalEpisodes: draft.totalEpisodes ?? '',
      status: draft.status ?? item.status,
      watchUrl: draft.watchUrl ?? '',
      category: draft.category ?? '',
      coverImage: draft.coverImage ?? item.coverImage,
      bangumiId: draft.bangumiId ?? item.bangumiId,
      // 排程三欄由編輯視窗整組給或整組不給，沒帶就沿用原值，
      // 免得單純改個名字就把 GAS 掃到的下一集清掉
      tvmazeId: draft.tvmazeId ?? item.tvmazeId,
      nextEpisodeDate: draft.nextEpisodeDate ?? item.nextEpisodeDate,
      nextEpisodeLabel: draft.nextEpisodeLabel ?? item.nextEpisodeLabel,
    };

    setList(prev => prev.map(i => (i.rowNumber === item.rowNumber ? { ...i, ...patch } : i)));
    // 進度可能在此被改寫，同步已存檔值，否則之後 blur 會誤判成沒變更
    committedProgressRef.current.set(item.rowNumber, patch.progress);
    setItemToEdit(null);

    try {
      await postAction({
        action: 'updateMeta',
        sheet: currentAccount,
        row: item.rowNumber,
        ...patch,
      });
      return true;
    } catch (err) {
      console.error('Failed to update item:', err);
      pushToast(`儲存失敗：${(err as Error).message}`);
      fetchData();
      return false;
    }
  };

  /** 切換狀態（在追 → 完結等）；不更新時間戳，避免清單順序亂跳 */
  const handleSetStatus = async (item: AnimeItem, status: WatchStatus) => {
    if (!APPS_SCRIPT_URL) return;

    setList(prev => prev.map(i => (i.rowNumber === item.rowNumber ? { ...i, status } : i)));

    try {
      await postAction({ action: 'updateMeta', sheet: currentAccount, row: item.rowNumber, status });
    } catch (err) {
      console.error('Failed to set status:', err);
      pushToast(`狀態未存檔：${(err as Error).message}`);
      fetchData();
    }
  };

  /** 實際把進度送到 GAS；失敗會明確提示，不再靜默吃掉 */
  const commitProgress = async (rowNumber: number, progress: string) => {
    pendingProgressRef.current.delete(rowNumber);
    try {
      await postAction({ action: 'update', sheet: currentAccount, row: rowNumber, progress });
      committedProgressRef.current.set(rowNumber, progress);
      setList(prev => {
        const next = prev.map(i => (i.rowNumber === rowNumber ? { ...i, date: todayLabel() } : i));
        try {
          localStorage.setItem(cacheKey(currentAccount), JSON.stringify(next));
        } catch {
          // 忽略快取寫入失敗
        }
        return next;
      });
    } catch (err) {
      console.error('Failed to update progress:', err);
      pushToast('進度沒存到雲端，請確認網路後重試');
      fetchData();
    }
  };

  /** 本地先更新、延遲送出；連按只會送最後一次 */
  const scheduleProgressSave = (rowNumber: number, progress: string) => {
    pendingProgressRef.current.set(rowNumber, progress);

    const existing = progressTimersRef.current.get(rowNumber);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      progressTimersRef.current.delete(rowNumber);
      commitProgress(rowNumber, progress);
    }, PROGRESS_DEBOUNCE_MS);

    progressTimersRef.current.set(rowNumber, timer);
  };

  /** 把所有 debounce 中的進度立刻送出（切帳號 / 關分頁前） */
  const flushPendingProgress = () => {
    progressTimersRef.current.forEach(timer => clearTimeout(timer));
    progressTimersRef.current.clear();
    const pending = new Map(pendingProgressRef.current);
    pending.forEach((progress, rowNumber) => commitProgress(rowNumber, progress));
  };

  const applyProgress = (item: AnimeItem, newProgress: string) => {
    setList(prev =>
      prev.map(i =>
        i.rowNumber === item.rowNumber ? { ...i, progress: newProgress, date: todayLabel() } : i
      )
    );
    scheduleProgressSave(item.rowNumber, newProgress);
  };

  const handleIncrement = (item: AnimeItem) => {
    const current = parseInt(item.progress || '0', 10);
    const base = Number.isNaN(current) ? 0 : current;
    applyProgress(item, String(base + 1));
  };

  const handleDecrement = (item: AnimeItem) => {
    const current = parseInt(item.progress || '0', 10);
    if (Number.isNaN(current) || current <= 0) return;
    applyProgress(item, String(current - 1));
  };

  const handleInputChange = (item: AnimeItem, value: string) => {
    // 即時更新本地狀態以保持響應性，實際送出等 blur
    setList(prev => prev.map(i => (i.rowNumber === item.rowNumber ? { ...i, progress: value } : i)));
  };

  const handleInputBlur = (item: AnimeItem) => {
    const next = item.progress === '' ? '0' : item.progress;
    // 與已存檔值相同就不送出、也不更新日期；空字串歸零僅本地處理
    if (next === committedProgressRef.current.get(item.rowNumber)) {
      if (item.progress === '') {
        setList(prev =>
          prev.map(i => (i.rowNumber === item.rowNumber ? { ...i, progress: '0' } : i))
        );
      }
      return;
    }
    applyProgress(item, next);
  };

  const handleDeleteAccount = async (handleLogout: () => void) => {
    if (!currentAccount || !APPS_SCRIPT_URL) return;
    setRefreshing(true);
    try {
      await postAction({ action: 'deleteAccount', name: currentAccount, sheet: currentAccount });
      localStorage.removeItem(cacheKey(currentAccount));
      setShowDeleteAccount(false);
      handleLogout();
      setList([]);
    } catch (err) {
      console.error('Failed to delete account:', err);
      pushToast(`刪除帳號失敗：${(err as Error).message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // 登入 / 切帳號：先用本機快取秒開，再背景同步雲端
  useEffect(() => {
    if (!isLoggedIn || !currentAccount) return;

    let cached: AnimeItem[] = [];
    try {
      const raw = localStorage.getItem(cacheKey(currentAccount));
      if (raw) cached = JSON.parse(raw);
    } catch {
      cached = [];
    }

    if (cached.length) {
      setList(cached);
      setDisplayOrder(computeOrder(cached, sortBy));
      committedProgressRef.current = new Map(cached.map(i => [i.rowNumber, i.progress]));
    } else {
      setList([]);
      setDisplayOrder([]);
    }

    fetchData(currentAccount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, currentAccount]);

  // 切到背景或關閉分頁前，把還沒送出的進度補送
  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === 'hidden') flushPendingProgress();
    };
    document.addEventListener('visibilitychange', flush);
    window.addEventListener('pagehide', flushPendingProgress);
    return () => {
      document.removeEventListener('visibilitychange', flush);
      window.removeEventListener('pagehide', flushPendingProgress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAccount]);

  return {
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
    pushToast,
    fetchData,
    handleManualRefresh,
    handleAddItem,
    handleDeleteItem,
    handleUpdateMeta,
    handleSetStatus,
    handleIncrement,
    handleDecrement,
    handleInputChange,
    handleInputBlur,
    handleDeleteAccount,
  };
}
