/**
 * Moraine State Park Bluebird Trail - Google Sheets Sync Webhook
 * 
 * Account: dugslade@gmail.com
 * Master Spreadsheet Tabs:
 * 1. "Inspections"    - Daily field checks & logs submitted by volunteers
 * 2. "Box Locations"  - Master registry of bird boxes, trail areas, and GPS coordinates
 */

const INSPECTION_HEADERS = [
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

const BOX_LOCATION_HEADERS = [
  'Box Number / Code',
  'Trail / Area',
  'GPS Coordinates',
  'Description / Location Notes',
  'Status'
];

function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};
  const action = params.action;

  // Retrieve Box Locations for Map
  if (action === 'get_boxes') {
    return fetchBoxLocationsResponse();
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    message: 'Moraine State Park Bluebird Sync Webhook is running',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(30000);

  try {
    let data;
    if (e.postData && e.postData.contents) {
      try {
        data = JSON.parse(e.postData.contents);
      } catch (err) {
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

    // Retrieve Box Locations
    if (data.action === 'get_boxes') {
      return fetchBoxLocationsResponse();
    }

    // ----------------------------------------------------
    // Log Inspections
    // ----------------------------------------------------
    const sheet = getOrCreateInspectionsSheet();
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

    const existingIds = getExistingSyncIds(sheet);
    const rowsToAdd = [];
    const addedIds = [];

    for (let i = 0; i < inspections.length; i++) {
      const item = inspections[i];
      const syncId = item.id || ('legacy_' + Date.now() + '_' + i);

      if (existingIds.has(syncId)) {
        continue;
      }

      const actionsStr = Array.isArray(item.actions) ? item.actions.join(', ') : (item.actions || '');
      
      const row = [
        new Date(),
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
      sheet.getRange(startRow, 1, rowsToAdd.length, INSPECTION_HEADERS.length).setValues(rowsToAdd);
      
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

// --------------------------------------------------------
// BOX LOCATIONS HANDLERS
// --------------------------------------------------------
function fetchBoxLocationsResponse() {
  const boxSheet = getOrCreateBoxLocationsSheet();
  const lastRow = boxSheet.getLastRow();
  const boxes = [];

  if (lastRow > 1) {
    const data = boxSheet.getRange(2, 1, lastRow - 1, BOX_LOCATION_HEADERS.length).getValues();
    for (let r = 0; r < data.length; r++) {
      const boxCode = String(data[r][0] || '').trim();
      if (!boxCode) continue;

      const trail = String(data[r][1] || 'North Shore').trim();
      const coords = String(data[r][2] || '').trim();
      const desc = String(data[r][3] || '').trim();
      const status = String(data[r][4] || 'Active').trim();

      let lat = null;
      let lng = null;

      if (coords) {
        // Parse "lat, lng" or "(lat, lng)"
        const clean = coords.replace(/[()]/g, '');
        const parts = clean.split(',');
        if (parts.length >= 2) {
          const pLat = parseFloat(parts[0].trim());
          const pLng = parseFloat(parts[1].trim());
          if (!isNaN(pLat) && !isNaN(pLng)) {
            lat = pLat;
            lng = pLng;
          }
        }
      }

      boxes.push({
        boxCode: boxCode,
        trailArea: trail,
        gpsCoords: coords,
        lat: lat,
        lng: lng,
        description: desc,
        status: status
      });
    }
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'success',
    count: boxes.length,
    boxes: boxes
  })).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateInspectionsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Inspections');

  if (!sheet) {
    sheet = ss.insertSheet('Inspections', 0);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(INSPECTION_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, INSPECTION_HEADERS.length);
    headerRange.setBackground('#1b4332');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    for (let c = 1; c <= INSPECTION_HEADERS.length; c++) {
      sheet.autoResizeColumn(c);
    }
  }

  return sheet;
}

function getOrCreateBoxLocationsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Box Locations');

  if (!sheet) {
    sheet = ss.insertSheet('Box Locations');
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(BOX_LOCATION_HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, BOX_LOCATION_HEADERS.length);
    headerRange.setBackground('#002D9C'); // IBM Blue / Navy
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    sheet.setFrozenRows(1);

    // Populate standard sample boxes for Moraine State Park if brand new
    const sampleBoxes = [
      ['Box 1', 'North Shore', '40.963124, -80.085432', 'Near North Shore Trailhead kiosk', 'Active'],
      ['Box 2', 'North Shore', '40.964210, -80.083150', 'Open meadow near mile marker 0.3', 'Active'],
      ['Box 3', 'North Shore', '40.965840, -80.081200', 'East of bicycle rental pavilion', 'Active'],
      ['Box 4', 'South Shore', '40.942150, -80.098450', 'Pleasant Valley picnic area', 'Active'],
      ['Box 5', 'South Shore', '40.940890, -80.095320', 'South Shore boat launch shoreline', 'Active']
    ];
    sheet.getRange(2, 1, sampleBoxes.length, BOX_LOCATION_HEADERS.length).setValues(sampleBoxes);

    for (let c = 1; c <= BOX_LOCATION_HEADERS.length; c++) {
      sheet.autoResizeColumn(c);
    }
  }

  return sheet;
}

function getExistingSyncIds(sheet) {
  const ids = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return ids;

  const syncIdCol = 17;
  const values = sheet.getRange(2, syncIdCol, lastRow - 1, 1).getValues();
  for (let r = 0; r < values.length; r++) {
    const val = values[r][0];
    if (val) ids.add(String(val).trim());
  }
  return ids;
}
