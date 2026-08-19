'use client';

import { useState, useEffect } from 'react';
import Modal, { fieldClass, labelClass } from './Modal';
import { getGimyDomain, setGimyDomain, DEFAULT_GIMY_DOMAIN } from '@/lib/watchUrl';
import { fetchCalendarEnabled, saveCalendarEnabled } from '@/lib/calendarSetting';

/**
 * 行事曆提醒只開放給這個帳號。
 *
 * 開關值是 GAS 的 Script Property（全站一份），寫進去的也是專案擁有者的「追番」日曆，
 * 不是登入者自己的。別人開了只會污染你的日曆，所以乾脆不給看
 */
const CALENDAR_OWNER = 'larry';

/** 開關值的本機快取；只為了讓視窗一開就能按，真實值仍以 GAS 回傳為準 */
const CALENDAR_CACHE_KEY = 'calendarEnabledCache';

const readCachedCalendar = (): boolean | null => {
  try {
    const raw = localStorage.getItem(CALENDAR_CACHE_KEY);
    return raw === 'true' ? true : raw === 'false' ? false : null;
  } catch {
    return null;
  }
};

const writeCachedCalendar = (value: boolean) => {
  try {
    localStorage.setItem(CALENDAR_CACHE_KEY, String(value));
  } catch {
    // 快取寫入失敗不影響主流程
  }
};

interface SettingsModalProps {
  currentAccount: string;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onShowHelp: () => void;
  onClose: () => void;
}

export default function SettingsModal({
  currentAccount,
  onLogout,
  onDeleteAccount,
  onShowHelp,
  onClose,
}: SettingsModalProps) {
  const [domain, setDomain] = useState(getGimyDomain());
  const [saved, setSaved] = useState(false);

  const canUseCalendar = currentAccount === CALENDAR_OWNER;

  // null = 還沒讀到（設定存在 GAS，不是本機）；有快取就先用，視窗一開就能按
  const [calendarOn, setCalendarOn] = useState<boolean | null>(readCachedCalendar);
  const [calendarBusy, setCalendarBusy] = useState(false);
  const [calendarError, setCalendarError] = useState('');

  useEffect(() => {
    // 看不到開關的帳號連讀都不用讀，省一趟 GAS 往返
    if (!canUseCalendar) return;

    let alive = true;
    fetchCalendarEnabled()
      .then(value => {
        writeCachedCalendar(value);
        if (alive) setCalendarOn(value);
      })
      .catch(() => alive && setCalendarError('讀不到目前設定'));
    return () => {
      alive = false;
    };
  }, [canUseCalendar]);

  const toggleCalendar = async () => {
    if (calendarOn === null || calendarBusy) return;
    const next = !calendarOn;

    setCalendarBusy(true);
    setCalendarError('');
    try {
      // 以後端回傳值為準：開啟會補寫提醒、關閉會清掉未來的提醒，都由後端執行
      const saved = await saveCalendarEnabled(next);
      writeCachedCalendar(saved);
      setCalendarOn(saved);
    } catch (err) {
      console.error(err);
      setCalendarError('切換失敗，請稍後再試');
    } finally {
      setCalendarBusy(false);
    }
  };

  const saveDomain = () => {
    setGimyDomain(domain);
    setDomain(getGimyDomain());
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <Modal title="設定" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <label className={labelClass}>gimy 網域</label>
          <div className="flex gap-2">
            <input
              type="url"
              value={domain}
              onChange={e => setDomain(e.target.value)}
              placeholder={DEFAULT_GIMY_DOMAIN}
              className={fieldClass}
            />
            <button
              onClick={saveDomain}
              className="h-10 shrink-0 rounded-lg border border-line px-3 text-[13px] text-dim transition-colors hover:border-line-hi hover:text-text"
            >
              {saved ? '已存' : '儲存'}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] leading-relaxed text-faint">
            gimy 換網域時只要改這裡，所有作品的「看」按鈕會自動跟著更新。
            此設定存在這台裝置，換瀏覽器要重設一次。
          </p>
        </div>

        {canUseCalendar && (
        <div className="border-t border-line pt-4">
          <button
            onClick={toggleCalendar}
            disabled={calendarOn === null || calendarBusy}
            className="flex w-full items-center gap-3 text-left disabled:opacity-60"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] text-text">追番行事曆提醒</span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-faint">
                每天 08:00 把近 14 天的更新寫進「追番」日曆。關掉會一併移除未來的提醒；
                卡片上的更新日期不受影響
              </span>
            </span>

            <span
              className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
                calendarOn ? 'bg-accent' : 'bg-line'
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left] ${
                  calendarOn ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </span>
          </button>

          {calendarBusy && <p className="mt-1.5 text-[11px] text-faint">處理中…</p>}
          {calendarError && <p className="mt-1.5 text-[11px] text-warn">{calendarError}</p>}
        </div>
        )}

        <div className="border-t border-line pt-4">
          <p className={labelClass}>帳號</p>
          <p className="mb-3 text-[14px] font-semibold text-text">{currentAccount}</p>

          <div className="space-y-1.5">
            <button
              onClick={onShowHelp}
              className="w-full rounded-lg border border-line px-3 py-2.5 text-left text-[13px] text-dim transition-colors hover:text-text"
            >
              使用說明
            </button>
            <button
              onClick={onLogout}
              className="w-full rounded-lg border border-line px-3 py-2.5 text-left text-[13px] text-dim transition-colors hover:text-text"
            >
              登出
            </button>
            <button
              onClick={onDeleteAccount}
              className="w-full rounded-lg border border-danger/30 px-3 py-2.5 text-left text-[13px] text-danger transition-colors hover:bg-danger/10"
            >
              註銷帳號（永久刪除所有資料）
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
