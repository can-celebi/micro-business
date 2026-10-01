// micro-business poll backend: Google Apps Script bound to a Google Sheet.
// Setup: see backend/SETUP.md. Stores one row per submission; GET returns the
// latest answer per anonymous browser id as JSON.

const SHEET_NAME = 'responses';

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['time', 'poll', 'session', 'client', 'value']);
  }
  return sh;
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse(e.postData.contents);
    const poll = String(d.poll || '').slice(0, 64);
    const session = String(d.session || '').slice(0, 32);
    const client = String(d.client || '').slice(0, 64);
    const value = JSON.stringify(d.value === undefined ? null : d.value).slice(0, 200);
    if (!poll || !client) return out_({ ok: false });
    // leading apostrophe keeps Sheets from reinterpreting the JSON text
    sheet_().appendRow([new Date(), poll, session, client, "'" + value]);
    return out_({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const poll = e.parameter.poll || '';
  const session = e.parameter.session || '';
  const rows = sheet_().getDataRange().getValues().slice(1);
  const latest = {};
  rows.forEach(function (r) {
    if (r[1] !== poll) return;
    if (session && r[2] !== session) return;
    let v;
    try { v = JSON.parse(String(r[4]).replace(/^'/, '')); } catch (err) { v = String(r[4]); }
    latest[r[3]] = { value: v, time: r[0] };
  });
  const responses = Object.keys(latest).map(function (k) { return latest[k]; });
  return out_({ poll: poll, session: session, n: responses.length, responses: responses });
}
