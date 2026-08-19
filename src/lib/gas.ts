/**
 * Google Apps Script webhook 的共用呼叫。
 *
 * exec 端點會間歇性回 404（同一個網址連打五次實測 200/200/200/404/200，
 * 轉址到 script.googleusercontent.com 那段不穩），所以讀取一律重試一次。
 */

export const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

const RETRY_DELAY_MS = 800;

/** GET，失敗（丟例外或回非預期內容）時重試一次 */
export async function gasGet<T>(params: Record<string, string>, isValid: (json: unknown) => boolean): Promise<T> {
  const query = new URLSearchParams(params).toString();

  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?${query}`);
      const json = await res.json();
      if (isValid(json) || attempt > 0) return json as T;
    } catch (err) {
      if (attempt > 0) throw err;
    }
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
  }
}

/** POST；GAS 會 302 轉址，必須 follow。不重試——重送有機會寫入兩次 */
export async function gasPost<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify(body),
  });

  const result = await res.json();
  if (!res.ok || result?.error) throw new Error(result?.error || `HTTP ${res.status}`);
  return result as T;
}
