const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;

function getUrl(params: Record<string, string> = {}) {
  if (!APPS_SCRIPT_URL) throw new Error('APPS_SCRIPT_URL is not defined');
  const url = new URL(APPS_SCRIPT_URL);
  Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
  return url.toString();
}

export async function getAnimeData(sheetName?: string) {
  const url = sheetName ? getUrl({ sheet: sheetName }) : getUrl();

  const response = await fetch(url, {
    redirect: 'follow',
    next: { revalidate: 0 }
  });

  if (!response.ok) throw new Error(`Apps Script responded with status: ${response.status}`);

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    if (text.includes('<!DOCTYPE html>')) {
      throw new Error('Google Apps Script 回傳了 HTML 頁面，可能是腳本未部署為客製化或權限問題。');
    }
    throw new Error(`Google Apps Script 回傳非 JSON 格式: ${text.slice(0, 50)}...`);
  }

  return await response.json();
}

export async function fetchSheets() {
  const url = getUrl({ action: 'getSheets' });
  const response = await fetch(url, {
    redirect: 'follow',
    next: { revalidate: 0 }
  });

  if (!response.ok) throw new Error(`Failed to fetch sheets: ${response.status}`);

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export async function createSheet(name: string) {
  const url = getUrl();
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({
      action: 'createSheet',
      name: name,
    }),
  });
  return await response.json();
}

export async function updateAnimeProgress(rowNumber: number, newProgress: string, sheetName?: string) {
  const url = getUrl();
  const response = await fetch(url, {
    method: 'POST',
    redirect: 'follow',
    body: JSON.stringify({
      action: 'update',
      row: rowNumber,
      progress: newProgress,
      sheet: sheetName,
    }),
  });
  return await response.json();
}
