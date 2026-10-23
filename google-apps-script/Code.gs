/**
 * Moraine State Park Bluebird Trail - Google Sheets Sync Webhook
 * 
 * Account: dugslade@gmail.com
 * Instructions:
 * 1. Open Google Sheets at https://sheets.google.com under your dugslade@gmail.com account.
 * 2. Create a new Spreadsheet: "Moraine State Park - Bluebird Monitoring"
 * 3. In the menu, click Extensions > Apps Script.
 * 4. Replace any default code with this entire script.
 * 5. Click "Deploy" > "New deployment".
 * 6. Select type: "Web app".
 * 7. Set:
 *    - Execute as: "Me (dugslade@gmail.com)"
 *    - Who has access: "Anyone" (allows offline mobile volunteers to submit without signing into Google)
 * 8. Click "Deploy", authorize permissions, and copy the Web App URL (starts with https://script.google.com/macros/s/...)
 * 9. Paste that URL into the Settings tab of your Moraine Bluebird Web App!
 */

const HEADERS = [
  'Submission Timestamp',
  'Box Number / Code',
  'Trail / Area',
  'Volunteer Name',
  'Check Date & Time',
  'GPS Coordinates',
  'Box Status / In Use',
  'Bird Species',
  'Nest Stage',
  'Number of Eggs',
  'Number of Live Chicks',
  'Chick Development Stage',
  'Number of Dead Chicks',
  'Fledglings Observed',
  'Maintenance / Actions Taken',
  'Volunteer Notes & Comments',
  'Local Sync ID'
];

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    message: 'Moraine State Park Bluebird Sync Webhook is running',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  // Wait up to 30 seconds for concurrent submissions
  lock.tryLock(30000);

  try {
    const sheet = getOrCreateSheet();
    let data;

    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
        // Fallback for form-urlencoded or parameter parsing
        data = e.parameter;
      }
    } else {
      data = e.parameter;
    }

    if (!data) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'error',
        message: 'No data received'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Ping / Test check
    if (data.action === 'ping') {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Ping test successful!'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Single inspection or batch inspections
    let inspections = [];
    if (data.action === 'batch_log_inspections' && Array.isArray(data.inspections)) {
      inspections = data.inspections;
    } else if (data.inspection) {
      inspections = [data.inspection];
    } else if (data.boxCode) {
      inspections = [data];
    }

    if (inspections.length === 0) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'ignored',
        message: 'No valid inspections to log'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Existing sync IDs to prevent duplicate rows
    const existingIds = getExistingSyncIds(sheet);
    const rowsToAdd = [];
    const addedIds = [];

    for (let i = 0; i < inspections.length; i++) {
      const item = inspections[i];
      const syncId = item.id || ('legacy_' + Date.now() + '_' + i);

      // Skip if already logged in sheet
      if (existingIds.has(syncId)) {
        continue;
      }

      const actionsStr = Array.isArray(item.actions) ? item.actions.join(', ') : (item.actions || '');
      
      const row = [
        new Date(), // Submission Timestamp
        item.boxCode || '',
        item.trailArea || '',
        item.volunteerName || '',
        item.checkDateTime || '',
        item.gpsCoords || '',
        item.boxInUse || '',
        item.species || '',
        item.nestStage || '',
        item.numEggs !== undefined ? Number(item.numEggs) : 0,
        item.numChicks !== undefined ? Number(item.numChicks) : 0,
        item.chickStage || '',
        item.numDead !== undefined ? Number(item.numDead) : 0,
        item.numFledged !== undefined ? Number(item.numFledged) : 0,
        actionsStr,
        item.comments || '',
        syncId
      ];

      rowsToAdd.push(row);
      addedIds.push(syncId);
      existingIds.add(syncId);
    }

    if (rowsToAdd.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet.getRange(startRow, 1, rowsToAdd.length, HEADERS.length).setValues(rowsToAdd);
      
      // Format number columns
      sheet.getRange(startRow, 10, rowsToAdd.length, 2).setNumberFormat('#,##0');
      sheet.getRange(startRow, 13, rowsToAdd.length, 2).setNumberFormat('#,##0');
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      addedCount: rowsToAdd.length,
      syncedIds: addedIds
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Inspections');

  if (!sheet) {
    sheet = ss.insertSheet('Inspections', 0);
  }

  // If first row is empty, setup headers and formatting
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);

    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground('#1b4332'); // Forest green
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);

    // Auto-fit column widths
    for (let c = 1; c <= HEADERS.length; c++) {
      sheet.autoResizeColumn(c);
    }
  }

  return sheet;
}

function getExistingSyncIds(sheet) {
  const ids = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return ids;

  // Sync ID is column 17
  const syncIdCol = 17;
  const values = sheet.getRange(2, syncIdCol, lastRow - 1, 1).getValues();
  for (let r = 0; r < values.length; r++) {
    const val = values[r][0];
    if (val) ids.add(String(val).trim());
  }
  return ids;
}
