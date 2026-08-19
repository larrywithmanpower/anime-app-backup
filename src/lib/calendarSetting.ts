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
  try {
    const json = await gasPost<SettingsResponse>({ action: 'updateSettings', calendarEnabled: enabled });
    if (typeof json?.calendarEnabled === 'boolean') return json.calendarEnabled;
  } catch {
    // exec 端點間歇性回 404，掛的是最後轉址那一段，後端其實已經跑完了。
    // 直接報失敗會騙人（畫面說沒存、行事曆已經改了）
  }

  // 這個 action 冪等，回頭讀一次真實狀態，比重送 POST 安全
  return fetchCalendarEnabled();
}
