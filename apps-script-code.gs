/**
 * ANIME TRACKER BACKEND
 * 
 * 重要：更新代碼後，請點擊「部署 > 管理部署 > 編輯 (鉛筆) > 版本：全新版本 > 部署」
 */

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
      return response(addNewItem(ss, data.sheet, data.name));
    }

    if (data.action === "deleteItem") {
      return response(deleteItem(ss, data.sheet, data.row));
    }

    if (data.action === "update") {
      return response(updateProgress(ss, data.sheet, data.row, data.progress));
    }

    if (data.action === "updateName") {
      return response(updateName(ss, data.sheet, data.row, data.name));
    }

    if (data.action === "deleteAccount") {
      return response(deleteAccount(ss, data.sheet));
    }

    if (data.action === "updateLatestBatch") {
      return response(updateLatestBatch(ss, data.sheet, data.updates));
    }

    if (data.action === "toggleFavorite") {
      return response(toggleFavorite(ss, data.sheet, data.row, data.favorite));
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

function getSheetData(ss, sheetName) {
  var sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
  if (!sheet) throw new Error("找不到分頁: " + (sheetName || "第一個分頁"));
  
  // 強制檢查第一列 A1 到 E1
  var headerRange = sheet.getRange(1, 1, 1, 5);
  var headers = headerRange.getValues()[0];
  
  // 如果最後一格不是「追蹤」，強制更新整行表頭
  if (headers[4] !== "追蹤") {
    var standardHeaders = [["最後更新時間", "作品名稱", "目前進度", "最新進度(AI)", "追蹤"]];
    headerRange.setValues(standardHeaders);
    sheet.setFrozenRows(1); // 確保標題列被凍結
  }
  
  // 強制返回 A 到 E 共 5 欄數據，確保前端索引不偏移
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [];
  return sheet.getRange(1, 1, lastRow, 5).getValues();
}

function createNewAccount(ss, name) {
  if (ss.getSheetByName(name)) throw new Error("帳號 「" + name + "」 已經存在");
  var newSheet = ss.insertSheet(name);
  // 固定標題列：最後更新時間, 作品名稱, 目前進度, 最新進度(AI), 追蹤
  var headers = [["最後更新時間", "作品名稱", "目前進度", "最新進度(AI)", "追蹤"]];
  newSheet.getRange(1, 1, 1, 5).setValues(headers);
  newSheet.setFrozenRows(1); // 凍結第一列
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

function updateProgress(ss, sheetName, row, progress) {
  var sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
  if (!sheet) throw new Error("找不到分頁: " + sheetName);
  
  var rowIndex = parseInt(row);
  if (rowIndex <= 1) throw new Error("無效的操作：禁止修改標題列");
  
  sheet.getRange(rowIndex, 3).setValue(progress);
  sheet.getRange(rowIndex, 1).setValue(Utilities.formatDate(new Date(), "GMT+8", "yyyy/MM/dd"));
  return {success: true};
}

function updateName(ss, sheetName, row, newName) {
  var sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
  if (!sheet) throw new Error("找不到分頁: " + sheetName);
  
  var rowIndex = parseInt(row);
  if (rowIndex <= 1) throw new Error("無效的操作：禁止修改標題列");
  
  sheet.getRange(rowIndex, 2).setValue(newName);
  return {success: true};
}

function addNewItem(ss, sheetName, itemName) {
  var sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
  if (!sheet) throw new Error("找不到分頁: " + sheetName);
  
  var lastRow = sheet.getLastRow();
  var newRow = lastRow + 1;
  var date = Utilities.formatDate(new Date(), "GMT+8", "yyyy/MM/dd");
  
  sheet.getRange(newRow, 1).setValue(date);
  sheet.getRange(newRow, 2).setValue(itemName);
  sheet.getRange(newRow, 3).setValue("0"); // Initial progress
  
  return {success: true, rowNumber: newRow};
}

function deleteItem(ss, sheetName, row) {
  var sheet = sheetName ? ss.getSheetByName(sheetName) : ss.getSheets()[0];
  if (!sheet) throw new Error("找不到分頁: " + sheetName);
  
  var rowIndex = parseInt(row);
  if (rowIndex <= 1) throw new Error("無效的操作：禁止刪除標題列");
  
  sheet.deleteRow(rowIndex);
  
  return {success: true};
}

function updateLatestBatch(ss, sheetName, updates) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("找不到分頁: " + sheetName);
  
  var data = sheet.getDataRange().getValues();
  
  // 確保表格至少有 5 欄 (A:E)
  if (sheet.getLastColumn() < 5) {
     sheet.insertColumnsAfter(sheet.getLastColumn(), 5 - sheet.getLastColumn());
  }
  
  for (var i = 0; i < updates.length; i++) {
    var update = updates[i];
    for (var j = 1; j < data.length; j++) {
      // 使用 trim 確保名稱匹配精確
      if (String(data[j][1]).trim() === String(update.name).trim()) {
        sheet.getRange(j + 1, 4).setValue(update.latest); // 最新進度 (AI)
        sheet.getRange(j + 1, 1).setValue(new Date());   // 最後更新時間
        break;
      }
    }
  }
  return {success: true};
}

function toggleFavorite(ss, sheetName, row, isFavorite) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("找不到分頁: " + sheetName);
  
  var rowIndex = parseInt(row);
  if (rowIndex <= 1) throw new Error("無效的操作");
  
  // 第 5 欄為追蹤狀態 (TRUE/FALSE)
  sheet.getRange(rowIndex, 5).setValue(isFavorite ? "TRUE" : "FALSE");

  // 如果是取消追蹤，同時清空最新進度 (第 4 欄)
  if (!isFavorite) {
    sheet.getRange(rowIndex, 4).clearContent();
  }
  
  return {success: true, favorite: isFavorite};
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- 測試用函數 (可在開發者編輯器手動執行點擊「執行」來測試) ---
function TEST_LIST_SHEETS() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

}
