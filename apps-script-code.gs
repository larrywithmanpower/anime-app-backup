/**
 * ANIME TRACKER BACKEND
 *
 * 重要：更新代碼後，請點擊「部署 > 管理部署 > 編輯 (鉛筆) > 版本：全新版本 > 部署」
 *
 * Schema（12 欄）：
 *   A=最後更新時間  B=作品名稱  C=目前進度  D=總集數  E=狀態
 *   F=觀看連結      G=封面圖    H=BangumiID  I=類型
 *   J=TVmazeID      K=下一集日期  L=下一集資訊
 *
 * J～L 是播出排程：J 由使用者在前端手動綁定（自動配對命中率不夠、配錯會推錯提醒），
 * K／L 由每日定時觸發 refreshSchedule() 回填，前端只讀不寫（除了綁定當下那一次）。
 *
 * 舊帳號相容：D 欄原為「最新進度(AI)」、E 欄原為「追蹤(TRUE/FALSE)」，
 * 兩欄已改用途。讀取時由前端寬鬆解析（D 非純數字視為空、E 非合法狀態視為 watching），
 * 不需要手動清理舊資料。
 */

var COLUMN_COUNT = 13;
// D 欄「總集數」實際裝的是已播集數（進度條分母，回答「離最新一集還差幾集」）；
// M 欄才是這一季總共要出幾集，只用來判斷追完了沒
var HEADERS = ['最後更新時間', '作品名稱', '目前進度', '總集數', '狀態', '觀看連結', '封面圖', 'BangumiID', '類型', 'TVmazeID', '下一集日期', '下一集資訊', '本季總集數'];

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getData";

    if (action === "getSheets") {
      return response(listAllSheets(ss));
    }

    if (action === "getSettings") {
      return response(getSettings());
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

    if (data.action === "updateSettings") {
      return response(updateSettings(data));
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

  // 只要有任一格對不上就整行重寫（舊 5 欄／9 欄帳號會在此自動升級）
  for (var i = 0; i < COLUMN_COUNT; i++) {
    if (current[i] !== HEADERS[i]) {
      headerRange.setValues([HEADERS]);
      sheet.setFrozenRows(1);
      // K 欄要當純文字存：讓 Sheets 認成日期的話，讀出來是帶時區的 Date 物件，
      // JSON 化後變 UTC，前端一切就差一天
      sheet.getRange(1, 11, sheet.getMaxRows()).setNumberFormat('@');
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
    {key: 'category', col: 9},
    {key: 'tvmazeId', col: 10},
    {key: 'nextEpisodeDate', col: 11},
    {key: 'nextEpisodeLabel', col: 12},
    {key: 'seasonEpisodes', col: 13}
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

  // 「最後更新時間」代表最後看到哪一集，只有進度真的往前才動它。
  // 改封面、改名稱、切狀態都只是整理資料；清空進度（標記完結時常見）也不算看了新的一集。
  var progressChanged = data.progress !== undefined && data.progress !== null
    && String(data.progress) !== ''
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
    data.category || "",
    data.tvmazeId || "",
    data.nextEpisodeDate || "",
    data.nextEpisodeLabel || "",
    data.seasonEpisodes || ""
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

// --- 播出排程（每日定時觸發） ---

/**
 * 為什麼用行事曆而不是推播：GAS 送不了 Web Push。
 * VAPID 強制要求 ES256 簽章，而 Utilities.computeSignature() 只支援 HMAC 與 RSA、沒有 ECDSA，
 * 加上 payload 還要 ECDH + AES-128-GCM，等於要在 Apps Script 裡手刻一套密碼學。
 * 寫進 Google 行事曆則是原生 API，iPhone 與 Mac 直接收到系統通知，零額外基礎設施。
 */

var CALENDAR_NAME = '追番';
// 事件說明的開頭標記；刪除時只認這個前綴，絕不動使用者自己建的事件
var EVENT_MARKER = '追番進度管理自動建立';
var SETTING_CALENDAR = 'calendarEnabled';
// E 欄的合法值；舊帳號有不少列是空的或殘留 TRUE/FALSE
var VALID_STATUS = {watching: true, plan: true, done: true, dropped: true};
// 提醒時間（當天幾點跳通知）。全天事件的提醒只能綁在午夜，改用定時事件才叫得動
var NOTIFY_HOUR = 20;
// 只把這麼多天內的更新寫進行事曆，避免長篇連載一次灌爆整年
var CALENDAR_DAYS_AHEAD = 14;

function getTrackerCalendar() {
  var found = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  if (found.length) return found[0];

  // 新建的日曆預設是 UTC，事件時間雖然仍正確，但之後要改成全天事件會整批位移一天
  var created = CalendarApp.createCalendar(CALENDAR_NAME);
  created.setTimeZone('Asia/Taipei');
  return created;
}

function todayStamp() {
  return Utilities.formatDate(new Date(), 'GMT+8', 'yyyy-MM-dd');
}

function horizonStamp() {
  var horizon = new Date();
  horizon.setDate(horizon.getDate() + CALENDAR_DAYS_AHEAD);
  return Utilities.formatDate(horizon, 'GMT+8', 'yyyy-MM-dd');
}

/** 行事曆提醒預設關閉；卡片上的下一集本來就夠用，日曆是額外的 */
function isCalendarEnabled() {
  return PropertiesService.getScriptProperties().getProperty(SETTING_CALENDAR) === 'true';
}

function getSettings() {
  return {calendarEnabled: isCalendarEnabled()};
}

/**
 * 切換行事曆提醒。開啟時直接拿 Sheet 既有的 K／L 補寫，不用再打 TVmaze，
 * 所以很快；關閉時把未來的自動事件清掉，否則「關掉了還是收到提醒」。
 */
function updateSettings(data) {
  var enabled = data.calendarEnabled === true || data.calendarEnabled === 'true';
  PropertiesService.getScriptProperties().setProperty(SETTING_CALENDAR, enabled ? 'true' : 'false');

  if (enabled) {
    writeRemindersFromSheet();
  } else {
    clearFutureReminders();
  }

  return {success: true, calendarEnabled: enabled};
}

/** 依 Sheet 現有的下一集資料補齊提醒，不動 TVmaze */
function writeRemindersFromSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var calendar = getTrackerCalendar();
  var today = todayStamp();
  var horizon = horizonStamp();
  var sheets = ss.getSheets();

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    var rows = sheet.getRange(2, 1, lastRow - 1, COLUMN_COUNT).getValues();
    for (var r = 0; r < rows.length; r++) {
      var name = String(rows[r][1] || '');
      var status = String(rows[r][4] || '');
      if (!VALID_STATUS[status]) status = 'watching';
      var date = String(rows[r][10] || '').slice(0, 10);

      if (!name || !date) continue;
      if (status !== 'watching' && status !== 'plan') continue;
      if (date < today || date > horizon) continue;

      upsertReminder(calendar, name, {date: date, label: String(rows[r][11] || '')});
    }
  }
}

/**
 * 刪掉今天以後、由本程式建立的提醒。
 * 只認 EVENT_MARKER 開頭的說明欄，使用者自己加在「追番」日曆上的事件不會被碰到。
 */
function clearFutureReminders() {
  var found = CalendarApp.getCalendarsByName(CALENDAR_NAME);
  if (!found.length) return 0;

  var from = new Date();
  var to = new Date();
  to.setFullYear(to.getFullYear() + 2);

  var events = found[0].getEvents(from, to);
  var removed = 0;
  for (var i = 0; i < events.length; i++) {
    if (String(events[i].getDescription() || '').indexOf(EVENT_MARKER) === 0) {
      events[i].deleteEvent();
      removed++;
    }
  }

  console.log('已移除 ' + removed + ' 則提醒');
  return removed;
}

/** 'YYYY-MM-DD' → 當天 NOTIFY_HOUR 點的 Date（用腳本時區，須設為台北） */
function airdateToDate(airdate) {
  var parts = airdate.split('-');
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), NOTIFY_HOUR, 0, 0);
}

/**
 * 從完整分集清單挑第一個還沒播的。
 * 絕對集數取清單位置——TVmaze 已依播出順序排好且預設不含特別篇，
 * 而使用者追動畫記的是「第 188 集」，不是 TVmaze 標的 S8E12。
 * 這段邏輯與前端 src/lib/tvmaze.ts 的 pickNextEpisode 必須一致。
 */
function pickNextEpisode(episodes, today) {
  var seasons = {};
  for (var i = 0; i < episodes.length; i++) seasons[episodes[i].season] = true;
  var multiSeason = Object.keys(seasons).length > 1;

  for (var j = 0; j < episodes.length; j++) {
    var airdate = episodes[j].airdate || '';
    if (airdate < today) continue;

    var absolute = j + 1;
    return {
      date: airdate,
      label: multiSeason
        ? '第 ' + absolute + ' 集（S' + episodes[j].season + 'E' + episodes[j].number + '）'
        : '第 ' + absolute + ' 集'
    };
  }
  return null;
}

var CN_DIGITS = '零一二三四五六七八九';

/** 從作品名稱讀出使用者追的是第幾季，讀不到回 0 */
function parseSeasonFromName(name) {
  var match = name.match(/第\s*([0-9]+|[一二三四五六七八九十]+)\s*季/);
  if (!match) return 0;

  var raw = match[1];
  if (/^[0-9]+$/.test(raw)) return Number(raw);

  if (raw === '十') return 10;
  if (raw.length === 2 && raw.charAt(0) === '十') return 10 + CN_DIGITS.indexOf(raw.charAt(1));
  if (raw.length === 2 && raw.charAt(1) === '十') return CN_DIGITS.indexOf(raw.charAt(0)) * 10;
  if (raw.length === 3 && raw.charAt(1) === '十') {
    return CN_DIGITS.indexOf(raw.charAt(0)) * 10 + CN_DIGITS.indexOf(raw.charAt(2));
  }
  return CN_DIGITS.indexOf(raw);
}

/**
 * 算出「目前為止已經播出幾集」，也就是最新集數。
 * 刻意不用分集清單的長度：TVmaze 連已公布但還沒播的都收進去，拿那個當分母會憑空多出幾集
 * （史萊姆這週才第 91 集，清單卻已經排到 96）。進度條要回答的是「我離最新一集還差幾集」。
 * 名稱有寫季別（「鑽石王牌 第四季」）就只算那一季——使用者的進度是從該季第 1 集起算，
 * 拿全系列 191 集去比會變成 1/191。季別在 TVmaze 對不上（完美世界是 S2021…S2026
 * 這種年份季）時退回整部，不硬猜。
 * 這段邏輯與前端 src/lib/tvmaze.ts 的 countAiredEpisodes 必須一致。
 */
function seasonPool(name, episodes) {
  var season = parseSeasonFromName(name);

  var pool = [];
  if (season > 0) {
    for (var i = 0; i < episodes.length; i++) {
      if (episodes[i].season === season) pool.push(episodes[i]);
    }
  }
  return pool.length ? pool : episodes;
}

/**
 * 這一季總共要出幾集（含已公布但還沒播的）。
 * 只拿來判斷「追完了沒」，不當進度條的分母——分母是已播集數。
 * 這個數字會浮動：TVmaze 只收已公布的集數，之後加播就會變多。
 */
function countSeasonEpisodes(name, episodes) {
  return seasonPool(name, episodes).length;
}

function countAiredEpisodes(name, episodes, today) {
  var pool = seasonPool(name, episodes);

  var aired = 0;
  for (var j = 0; j < pool.length; j++) {
    var airdate = pool[j].airdate || '';
    if (airdate && airdate <= today) aired++;
  }
  return aired;
}

/**
 * 已完結的作品出了新的一季沒有。
 *
 * TVmaze 一個 id 就是整部作品跨所有季，所以「新一季」在資料上不是新東西，
 * 只是「名稱寫的那一季之後還有集數」。名稱沒寫季別就沒得比，回 null。
 *
 * 回傳的形狀刻意與 pickNextEpisode 相同（date / label），直接沿用 K／L 兩欄：
 * 已完結的作品本來就沒有「下一集」，那兩欄對它們一直是空的，不會打架。
 */
function findNewSeasons(name, episodes, today) {
  var season = parseSeasonFromName(name);
  if (!season) return null;

  var seasons = [];
  var total = 0;
  var aired = 0;
  var earliest = '';

  for (var i = 0; i < episodes.length; i++) {
    var e = episodes[i];
    if (!(e.season > season)) continue;

    if (seasons.indexOf(e.season) < 0) seasons.push(e.season);
    total++;

    // 已宣布但還沒排出播出日的季別，TVmaze 會給沒有 airdate 的空殼集數
    var airdate = e.airdate || '';
    if (!airdate) continue;
    if (!earliest || airdate < earliest) earliest = airdate;
    if (airdate <= today) aired++;
  }

  if (!seasons.length) return null;
  seasons.sort(function (a, b) { return a - b; });

  var span = seasons.length > 1
    ? '第 ' + seasons[0] + '～' + seasons[seasons.length - 1] + ' 季'
    : '第 ' + seasons[0] + ' 季';

  var detail;
  if (!earliest) detail = '播出日未定';
  else if (aired === 0) detail = earliest.slice(5).replace('-', '.') + ' 開播';
  else if (aired < total) detail = '已開播 · 已播 ' + aired + ' 集';
  else detail = '共 ' + total + ' 集';

  return {date: earliest, label: span + ' · ' + detail};
}

function fetchShowSchedule(tvmazeId, name, today) {
  var url = 'https://api.tvmaze.com/shows/' + encodeURIComponent(tvmazeId) + '?embed=episodes';
  var res = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
  if (res.getResponseCode() !== 200) return null;

  var json = JSON.parse(res.getContentText());
  var episodes = (json && json._embedded && json._embedded.episodes) || [];
  return {
    next: pickNextEpisode(episodes, today),
    newSeasons: findNewSeasons(name, episodes, today),
    airedEpisodes: countAiredEpisodes(name, episodes, today),
    seasonEpisodes: countSeasonEpisodes(name, episodes)
  };
}

/**
 * 每日觸發的主流程：掃所有分頁裡綁過 TVmaze 的作品，回填 K／L 欄，
 * 並把近期更新寫進「追番」行事曆。
 *
 * 已完結的作品也要掃：TVmaze 一個 id 涵蓋所有季，出了新的一季只有這裡看得到，
 * 否則使用者得自己去查才會知道（實測一念永恆第四季已播兩個月、神墓漏了整整兩季）。
 * 它們的 K／L 裝的是新季提示、不是下一集，也不進行事曆——完結的作品不需要每週提醒。
 */
function refreshSchedule() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var today = todayStamp();
  var horizon = horizonStamp();

  // 關閉時仍要回填 K／L（卡片上的下一集照常顯示），只是不碰行事曆。
  // 也因此不能無條件呼叫 getTrackerCalendar()，否則會憑空建出沒人要的日曆
  var calendar = isCalendarEnabled() ? getTrackerCalendar() : null;

  var sheets = ss.getSheets();
  var checked = 0;

  for (var s = 0; s < sheets.length; s++) {
    var sheet = sheets[s];
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    ensureSchema(sheet);
    var rows = sheet.getRange(2, 1, lastRow - 1, COLUMN_COUNT).getValues();

    for (var r = 0; r < rows.length; r++) {
      var name = String(rows[r][1] || '');
      var tvmazeId = String(rows[r][9] || '');
      // 與前端 parseStatus 同一套寬鬆解析：舊帳號有很多列 E 欄是空的，
      // 畫面上顯示為「在追」，這裡若照字面比對就會整批被跳過
      var status = String(rows[r][4] || '');
      if (!VALID_STATUS[status]) status = 'watching';

      if (!name || !tvmazeId) continue;
      // 棄追的不管，其餘（含已完結）都掃
      if (status === 'dropped') continue;

      // TVmaze 是每 IP 每 10 秒 20 次，放慢一點就完全碰不到上限
      if (checked > 0) Utilities.sleep(600);
      checked++;

      var schedule = null;
      try {
        schedule = fetchShowSchedule(tvmazeId, name, today);
      } catch (err) {
        // 單一作品查詢失敗不該中斷整批；保留舊值等明天再試
        console.error(name + ' 排程查詢失敗: ' + err);
        continue;
      }
      if (!schedule) continue;

      // 完結的作品沒有「下一集」可言，那兩欄改裝「有沒有出新的一季」
      var done = status === 'done';
      var info = done ? schedule.newSeasons : schedule.next;

      var rowIndex = r + 2;
      sheet.getRange(rowIndex, 11).setValue(info ? info.date : '');
      sheet.getRange(rowIndex, 12).setValue(info ? info.label : '');

      // 已播集數每週都在長，所以每天覆蓋而不是只補空白。
      // 代價是綁了 TVmaze 的作品，手動改的總集數隔天會被蓋回去
      if (schedule.airedEpisodes > 0) {
        sheet.getRange(rowIndex, 4).setValue(schedule.airedEpisodes);
      }

      // 本季總集數也會變（TVmaze 只收已公布的集數，加播就會多），同樣每天覆蓋
      if (schedule.seasonEpisodes > 0) {
        sheet.getRange(rowIndex, 13).setValue(schedule.seasonEpisodes);
      }

      if (!done && calendar && info && info.date <= horizon) {
        upsertReminder(calendar, name, info);
      }
    }
  }

  console.log('已檢查 ' + checked + ' 部作品');
}

/** 同一天同一部只留一則提醒；重跑不會長出重複事件 */
function upsertReminder(calendar, name, next) {
  var title = name + ' · ' + next.label;
  var start = airdateToDate(next.date);
  var dayEvents = calendar.getEventsForDay(start);

  for (var i = 0; i < dayEvents.length; i++) {
    // 集數標籤會隨排程調整而變（延播、加話），標題前綴相同就視為同一則、直接改掉
    if (dayEvents[i].getTitle().indexOf(name + ' · ') === 0) {
      if (dayEvents[i].getTitle() !== title) dayEvents[i].setTitle(title);
      return;
    }
  }

  var end = new Date(start.getTime() + 30 * 60 * 1000);
  var event = calendar.createEvent(title, start, end, {
    description: '追番進度管理自動建立。排程資料來源：TVmaze（CC BY-SA）'
  });
  event.addPopupReminder(0);
}

/** 只需在 GAS 編輯器手動執行一次，之後每天 08:00 自動跑 */
function setupDailyTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'refreshSchedule') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('refreshSchedule').timeBased().everyDays(1).atHour(8).create();
  console.log('已建立每日 08:00 的排程更新觸發器');
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
