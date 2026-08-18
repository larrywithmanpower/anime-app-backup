/**
 * ANIME TRACKER BACKEND
 *
 * 重要：更新代碼後，請點擊「部署 > 管理部署 > 編輯 (鉛筆) > 版本：全新版本 > 部署」
 *
 * Schema（9 欄）：
 *   A=最後更新時間  B=作品名稱  C=目前進度  D=總集數  E=狀態
 *   F=觀看連結      G=封面圖    H=BangumiID  I=類型
 *
 * 舊帳號相容：D 欄原為「最新進度(AI)」、E 欄原為「追蹤(TRUE/FALSE)」，
 * 兩欄已改用途。讀取時由前端寬鬆解析（D 非純數字視為空、E 非合法狀態視為 watching），
 * 不需要手動清理舊資料。
 */

var COLUMN_COUNT = 9;
var HEADERS = ['最後更新時間', '作品名稱', '目前進度', '總集數', '狀態', '觀看連結', '封面圖', 'BangumiID', '類型'];

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getData";

    if (action === "getSheets") {
      return response(listAllSheets(ss));
    }

    // 預設抓取資料
    var sheetName = (e && e.parameter && e.parameter.sheet) ? e.parameter.sheet : null;
    return response(getSheetData(ss, sheetName));

  } catch (err) {
    return response({error: err.toString()});
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === "createSheet") {
      return response(createNewAccount(ss, data.name));
    }

    if (data.action === "addItem") {
      return response(addNewItem(ss, data.sheet, data));
    }

    if (data.action === "deleteItem") {
      return response(deleteItem(ss, data.sheet, data.row));
    }

    if (data.action === "update") {
      return response(updateProgress(ss, data.sheet, data.row, data.progress));
    }

    if (data.action === "updateMeta") {
      return response(updateMeta(ss, data.sheet, data.row, data));
    }

    // 舊版前端相容：只改名稱
    if (data.action === "updateName") {
      return response(updateMeta(ss, data.sheet, data.row, {name: data.name}));
    }

    if (data.action === "deleteAccount") {
      return response(deleteAccount(ss, data.sheet));
    }

    throw new Error("未知動作: " + data.action);

  } catch (err) {
    return response({error: err.toString()});
  }
}

// --- 功能函數 ---

function listAllSheets(ss) {
  return ss.getSheets().map(function(s) { return s.getName(); });
}

// 確保分頁至少有 COLUMN_COUNT 欄，且表頭正確
function ensureSchema(sheet) {
  if (sheet.getMaxColumns() < COLUMN_COUNT) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), COLUMN_COUNT - sheet.getMaxColumns());
  }

  var headerRange = sheet.getRange(1, 1, 1, COLUMN_COUNT);
  var current = headerRange.getValues()[0];

  // 只要有任一格對不上就整行重寫（舊 5 欄帳號會在此自動升級）
  for (var i = 0; i < COLUMN_COUNT; i++) {
    if (current[i] !== HEADERS[i]) {
      headerRange.setValues([HEADERS]);
      sheet.setFrozenRows(1);
      return;
    }
  }
}

function getSheetData(ss, sheetName) {
  var sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
  if (!sheet) throw new Error("找不到分頁: " + (sheetName || "第一個分頁"));

  ensureSchema(sheet);

  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];
  return sheet.getRange(1, 1, lastRow, COLUMN_COUNT).getValues();
}

function createNewAccount(ss, name) {
  if (ss.getSheetByName(name)) throw new Error("帳號 「" + name + "」 已經存在");
  var newSheet = ss.insertSheet(name);
  newSheet.getRange(1, 1, 1, COLUMN_COUNT).setValues([HEADERS]);
  newSheet.setFrozenRows(1);
  return {success: true, name: name};
}

function deleteAccount(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error("找不到該帳號: " + name);

  // 至少保留一個分頁
  if (ss.getSheets().length <= 1) {
    throw new Error("無法刪除唯一的帳號，請至少保留一個分頁");
  }

  ss.deleteSheet(sheet);
  return {success: true};
}

function getSheetOrThrow(ss, sheetName) {
  var sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
  if (!sheet) throw new Error("找不到分頁: " + sheetName);
  return sheet;
}

function today() {
  return Utilities.formatDate(new Date(), "GMT+8", "yyyy/MM/dd");
}

function updateProgress(ss, sheetName, row, progress) {
  var sheet = getSheetOrThrow(ss, sheetName);

  var rowIndex = parseInt(row);
  if (rowIndex <= 1) throw new Error("無效的操作：禁止修改標題列");

  sheet.getRange(rowIndex, 3).setValue(progress);
  sheet.getRange(rowIndex, 1).setValue(today());
  return {success: true};
}

/**
 * 更新單列的中繼資料。只寫有帶進來的欄位（undefined 代表不動）。
 * 支援：name / totalEpisodes / status / watchUrl / coverImage / bangumiId
 */
function updateMeta(ss, sheetName, row, data) {
  var sheet = getSheetOrThrow(ss, sheetName);

  var rowIndex = parseInt(row);
  if (rowIndex <= 1) throw new Error("無效的操作：禁止修改標題列");

  ensureSchema(sheet);

  // 先記下舊進度，寫入後才能判斷「最後更新時間」該不該動
  var previousProgress = String(sheet.getRange(rowIndex, 3).getValue());

  var fields = [
    {key: 'date', col: 1},
    {key: 'name', col: 2},
    {key: 'progress', col: 3},
    {key: 'totalEpisodes', col: 4},
    {key: 'status', col: 5},
    {key: 'watchUrl', col: 6},
    {key: 'coverImage', col: 7},
    {key: 'bangumiId', col: 8},
    {key: 'category', col: 9}
  ];

  var touched = false;
  for (var i = 0; i < fields.length; i++) {
    var value = data[fields[i].key];
    if (value !== undefined && value !== null) {
      sheet.getRange(rowIndex, fields[i].col).setValue(value);
      touched = true;
    }
  }

  if (!touched) throw new Error("updateMeta 沒有帶任何可更新欄位");

  // 有明確帶 date 就以它為準（資料整理時用來保住原本的最後觀看日期）
  var explicitDate = data.date !== undefined && data.date !== null;

  // 「最後更新時間」代表最後看到哪一集，只有進度真的變了才動它。
  // 改封面、改名稱、切狀態都只是整理資料，不該讓它跳到清單最前面。
  var progressChanged = data.progress !== undefined && data.progress !== null
    && String(data.progress) !== previousProgress;

  if (!explicitDate && progressChanged) {
    sheet.getRange(rowIndex, 1).setValue(today());
  }

  return {success: true};
}

function addNewItem(ss, sheetName, data) {
  var sheet = getSheetOrThrow(ss, sheetName);
  if (!data.name) throw new Error("缺少作品名稱");

  ensureSchema(sheet);

  var newRow = sheet.getLastRow() + 1;
  // 表頭必定在第 1 列，資料最早從第 2 列開始
  if (newRow < 2) newRow = 2;

  var values = [[
    today(),
    data.name,
    data.progress !== undefined && data.progress !== null ? String(data.progress) : "0",
    data.totalEpisodes || "",
    data.status || "watching",
    data.watchUrl || "",
    data.coverImage || "",
    data.bangumiId || "",
    data.category || ""
  ]];

  sheet.getRange(newRow, 1, 1, COLUMN_COUNT).setValues(values);

  return {success: true, rowNumber: newRow};
}

function deleteItem(ss, sheetName, row) {
  var sheet = getSheetOrThrow(ss, sheetName);

  var rowIndex = parseInt(row);
  if (rowIndex <= 1) throw new Error("無效的操作：禁止刪除標題列");

  sheet.deleteRow(rowIndex);

  return {success: true};
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
