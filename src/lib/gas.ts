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

/**
 * GAS 一筆寫入約 20 秒（冷啟動 + ensureSchema + 寫格子），所以上限抓得寬。
 * 但一定要有上限：沒有的話連線卡住就永遠 pending，畫面會一直停在「新增中…」，
 * 使用者只能重按，而重按會寫入兩次
 */
const POST_TIMEOUT_MS = 45000;

/** POST；GAS 會 302 轉址，必須 follow */
async function postOnce<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(POST_TIMEOUT_MS),
  }).catch((err: Error) => {
    // 逾時不代表沒寫進去，請求可能已經送達 Google 那邊了。
    // 所以訊息是「去確認」而不是「再試一次」——後者會重複寫入
    if (err.name === 'TimeoutError') throw new Error('等太久了，按同步鈕確認有沒有寫進去');
    throw err;
  });

  const result = await res.json();
  if (!res.ok || result?.error) throw new Error(result?.error || `HTTP ${res.status}`);
  return result as T;
}

/**
 * 寫入 GAS。
 *
 * 預設**不重試**——新增與刪除重送會多寫一筆 / 多刪一列。
 * `idempotent` 是給「把某一列的某幾格設成指定值」這種動作用的（改進度、改狀態、
 * 編輯欄位）：重送只是把同樣的值再寫一次，結果一樣。exec 端點約 8 次會壞 1 次，
 * 不重試的話使用者按 ＋ 加到 91 會被打回 88，比重送一次的風險糟得多
 */
export async function gasPost<T>(
  body: Record<string, unknown>,
  { idempotent = false } = {}
): Promise<T> {
  try {
    return await postOnce<T>(body);
  } catch (err) {
    if (!idempotent) throw err;
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    return postOnce<T>(body);
  }
}
