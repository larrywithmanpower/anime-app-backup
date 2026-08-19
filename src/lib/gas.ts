/**
 * Google Apps Script webhook 的共用呼叫。
 *
 * exec 端點有兩個毛病：
 * 1. 會間歇性回 404（同一個網址連打五次實測 200/200/200/404/200，轉址到
 *    script.googleusercontent.com 那段不穩）
 * 2. **單發延遲是隨機的**——同一支端點實測 2 秒到 77 秒都有，跟冷啟動沒有絕對關係
 *
 * 但並行不會互相拖慢（實測循序 3 發總牆鐘 40 秒、並行 3 發只要 3 秒），
 * 所以讀取採「對衝」：第一發超過門檻還沒回來就再補一發，誰先回來用誰。
 */

export const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || '';

/** 第一發超過這個時間沒回來才補下一發；正常回應約 2 秒，所以多數情況只會發一發 */
const HEDGE_AFTER_MS = 3000;
/** 最多同時在飛的發數 */
const MAX_ATTEMPTS = 3;
/** 冪等寫入重送前的間隔；寫入不能對衝，只能等失敗才重試 */
const POST_RETRY_DELAY_MS = 800;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * GET；同一個請求最多對衝 MAX_ATTEMPTS 發，取最快回來且格式正確的那發。
 *
 * GET 沒有副作用，重複發不會寫壞資料——這是它能對衝、而 POST 不行的原因。
 */
export async function gasGet<T>(params: Record<string, string>, isValid: (json: unknown) => boolean): Promise<T> {
  const url = `${APPS_SCRIPT_URL}?${new URLSearchParams(params).toString()}`;

  // 全部都不合格時的退路：把後端第一次回的東西原封帶回去，
  // 呼叫端才看得到 `{error: '找不到分頁'}` 這種真正的訊息，而不是被換成通用錯誤
  let fallback: unknown;

  const attempt = async (): Promise<T> => {
    const res = await fetch(url);
    const json = await res.json();
    if (fallback === undefined) fallback = json;
    if (!isValid(json)) throw new Error('回應格式不正確');
    return json as T;
  };

  const inFlight: Promise<T>[] = [attempt()];

  for (let i = 1; i < MAX_ATTEMPTS; i++) {
    const TIMED_OUT = Symbol('timeout');
    const winner = await Promise.race([
      // 目前在飛的都掛掉才會 reject，這時直接進下一輪補發
      Promise.any(inFlight).catch(() => TIMED_OUT),
      sleep(HEDGE_AFTER_MS).then(() => TIMED_OUT),
    ]);
    if (winner !== TIMED_OUT) return winner as T;
    inFlight.push(attempt());
  }

  try {
    return await Promise.any(inFlight);
  } catch {
    if (fallback !== undefined) return fallback as T;
    throw new Error('讀取失敗');
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
    await sleep(POST_RETRY_DELAY_MS);
    return postOnce<T>(body);
  }
}
