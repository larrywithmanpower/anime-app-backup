/**
 * 行事曆提醒開關。
 *
 * 存在 GAS 的 Script Properties，不是 localStorage——因為真正在用這個值的是
 * 每天 08:00 的定時觸發器，它跑在 Google 那邊，讀不到瀏覽器的東西。
 *
 * 預設關閉：卡片上已經會顯示下一集播出日，行事曆只是額外的提醒管道。
 */

import { gasGet, gasPost } from './gas';

interface SettingsResponse {
  calendarEnabled?: boolean;
}

export async function fetchCalendarEnabled(): Promise<boolean> {
  const json = await gasGet<SettingsResponse>(
    { action: 'getSettings' },
    j => typeof (j as SettingsResponse)?.calendarEnabled === 'boolean'
  );
  return json?.calendarEnabled === true;
}

/** 回傳後端實際採用的值；開啟會順便補寫提醒、關閉會清掉未來的提醒 */
export async function saveCalendarEnabled(enabled: boolean): Promise<boolean> {
  const json = await gasPost<SettingsResponse>({ action: 'updateSettings', calendarEnabled: enabled });
  return json?.calendarEnabled === true;
}
