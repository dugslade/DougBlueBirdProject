/**
 * Moraine State Park Bluebird Trail Monitor
 * Offline-First Progressive Web App (PWA)
 */

// Key constants & storage keys
const STORAGE_KEYS = {
  INSPECTIONS: 'moraine_bluebird_inspections',
  SETTINGS: 'moraine_bluebird_settings'
};

const DEFAULT_SETTINGS = {
  scriptUrl: 'https://script.google.com/macros/s/AKfycbwW6O8ity04LON-VJVOFnUBd_PQrd-MAgCxzjJ6mhXVi2d9nmoj8gX3MHQREJAMbZ755Q/exec',
  defaultVolunteer: '',
  defaultTrail: 'North Shore Trail'
};

// Global state
let state = {
  inspections: [],
  settings: { ...DEFAULT_SETTINGS },
  isOnline: navigator.onLine,
  isSyncing: false,
  html5QrCode: null
};

// ========================================================
// INITIALIZATION
// ========================================================
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  loadInspections();
  registerServiceWorker();
  initNavigation();
  initFormControls();
  initScanner();
  initSyncEngine();
  checkUrlParams();
  renderHistory();
  updateSyncStatus();
});

// Register Service Worker for 100% Offline Caching
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => {
        console.log('[PWA] Service Worker registered with scope:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  }
}

// ========================================================
// SETTINGS & STORAGE
// ========================================================
function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
    // Ensure default script URL is used if saved is blank
    if (!state.settings.scriptUrl) {
      state.settings.scriptUrl = DEFAULT_SETTINGS.scriptUrl;
    }
  } catch (e) {
    console.error('Error loading settings:', e);
  }

  // Populate settings form
  const scriptInput = document.getElementById('scriptUrl');
  const volunteerInput = document.getElementById('defaultVolunteer');
  const trailSelect = document.getElementById('defaultTrail');
  const formVolunteer = document.getElementById('volunteerName');
  const formTrail = document.getElementById('trailArea');

  if (scriptInput) scriptInput.value = state.settings.scriptUrl || '';
  if (volunteerInput) volunteerInput.value = state.settings.defaultVolunteer || '';
  if (trailSelect) trailSelect.value = state.settings.defaultTrail || 'North Shore Trail';

  // Apply default to form
  if (formVolunteer && state.settings.defaultVolunteer) {
    formVolunteer.value = state.settings.defaultVolunteer;
  }
  if (formTrail && state.settings.defaultTrail) {
    formTrail.value = state.settings.defaultTrail;
  }
}

function saveSettings() {
  const scriptInput = document.getElementById('scriptUrl');
  const volunteerInput = document.getElementById('defaultVolunteer');
  const trailSelect = document.getElementById('defaultTrail');

  state.settings.scriptUrl = (scriptInput.value || '').trim();
  state.settings.defaultVolunteer = (volunteerInput.value || '').trim();
  state.settings.defaultTrail = trailSelect.value;

  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));

  // Sync to form inputs
  const formVolunteer = document.getElementById('volunteerName');
  if (formVolunteer && !formVolunteer.value && state.settings.defaultVolunteer) {
    formVolunteer.value = state.settings.defaultVolunteer;
  }

  showToast('Settings saved successfully!', 'success');
}

function loadInspections() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.INSPECTIONS);
    state.inspections = saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error loading inspections:', e);
    state.inspections = [];
  }
}

function saveInspections() {
  try {
    localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(state.inspections));
  } catch (e) {
    console.error('Error saving inspections:', e);
  }
  renderHistory();
  updateSyncStatus();
}

// ========================================================
// NAVIGATION & TABS
// ========================================================
function initNavigation() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.tab;

      tabs.forEach((t) => t.classList.remove('active'));
      contents.forEach((c) => c.classList.remove('active'));

      tab.classList.add('active');
      const targetContent = document.getElementById(targetId);
      if (targetContent) {
        targetContent.classList.add('active');
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

// ========================================================
// URL QUERY PARAMETER HANDLING (For QR Code Links)
// ========================================================
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const boxParam = params.get('box') || params.get('b') || params.get('id');
  const trailParam = params.get('trail') || params.get('t');

  if (boxParam) {
    const boxInput = document.getElementById('boxCode');
    if (boxInput) {
      boxInput.value = boxParam.trim();
      showToast(`Scanned: ${boxParam.trim()}`, 'success');
    }
  }

  if (trailParam) {
    const trailSelect = document.getElementById('trailArea');
    if (trailSelect) {
      // Find matching option or set value
      for (let i = 0; i < trailSelect.options.length; i++) {
        if (trailSelect.options[i].text.toLowerCase().includes(trailParam.toLowerCase())) {
          trailSelect.selectedIndex = i;
          break;
        }
      }
    }
  }
}

// ========================================================
// FORM CONTROLS & STEPPERS
// ========================================================
function initFormControls() {
  // Set default datetime to now
  const dtInput = document.getElementById('checkDateTime');
  if (dtInput) {
    const now = new Date();
    // Offset for local timezone
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
    dtInput.value = localISOTime;
  }

  // Stepper buttons (+/-)
  document.querySelectorAll('.stepper-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const action = btn.dataset.action;
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      const display = document.getElementById(targetId.replace('num', 'val'));

      if (!input) return;

      let val = parseInt(input.value || '0', 10);
      if (isNaN(val)) val = 0;

      if (action === 'inc') {
        val += 1;
      } else if (action === 'dec') {
        val = Math.max(0, val - 1);
      }

      input.value = val;
      if (display) display.textContent = val;

      // Haptic feedback if supported
      if (navigator.vibrate) {
        navigator.vibrate(25);
      }
    });
  });

  // GPS Geolocation button
  const btnGPS = document.getElementById('btnGetGPS');
  if (btnGPS) {
    btnGPS.addEventListener('click', () => {
      if (!navigator.geolocation) {
        showToast('Geolocation is not supported on this device', 'warning');
        return;
      }

      btnGPS.textContent = '⏳ Locating...';
      btnGPS.disabled = true;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          const accuracy = Math.round(pos.coords.accuracy);
          document.getElementById('gpsCoords').value = `${lat}, ${lng} (±${accuracy}m)`;
          btnGPS.textContent = '📍 Get GPS';
          btnGPS.disabled = false;
          showToast(`GPS captured: ${lat}, ${lng}`, 'success');
        },
        (err) => {
          console.warn('Geolocation error:', err);
          btnGPS.textContent = '📍 Get GPS';
          btnGPS.disabled = false;
          showToast('Could not retrieve GPS coordinates', 'warning');
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }

  // Form submission
  const form = document.getElementById('inspectionForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFormSubmit();
    });
  }

  // Settings buttons
  const btnSaveSet = document.getElementById('btnSaveSettings');
  if (btnSaveSet) btnSaveSet.addEventListener('click', saveSettings);

  const btnTestWeb = document.getElementById('btnTestWebhook');
  if (btnTestWeb) btnTestWeb.addEventListener('click', testWebhook);

  const btnReset = document.getElementById('btnResetAll');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      if (confirm('Are you sure you want to clear all local inspection records and settings on this device?')) {
        localStorage.clear();
        state.inspections = [];
        state.settings = { ...DEFAULT_SETTINGS };
        saveSettings();
        renderHistory();
        showToast('All local data cleared', 'warning');
      }
    });
  }

  // History buttons
  const btnSyncHist = document.getElementById('btnSyncHistoryTab');
  if (btnSyncHist) btnSyncHist.addEventListener('click', () => syncAllPending(true));

  const btnSyncHead = document.getElementById('btnSyncHeader');
  if (btnSyncHead) btnSyncHead.addEventListener('click', () => syncAllPending(true));

  const btnExport = document.getElementById('btnExportCSV');
  if (btnExport) btnExport.addEventListener('click', exportToCSV);

  const btnClearSync = document.getElementById('btnClearSynced');
  if (btnClearSync) {
    btnClearSync.addEventListener('click', () => {
      const pendingCount = state.inspections.filter(i => !i.synced).length;
      state.inspections = state.inspections.filter(i => !i.synced);
      saveInspections();
      showToast(`Cleared synced items (${pendingCount} pending retained)`, 'success');
    });
  }
}

// ========================================================
// FORM SUBMIT HANDLER
// ========================================================
function handleFormSubmit() {
  const boxCode = document.getElementById('boxCode').value.trim();
  const volunteerName = document.getElementById('volunteerName').value.trim();

  if (!boxCode) {
    showToast('Please enter or scan a Box Number', 'warning');
    document.getElementById('boxCode').focus();
    return;
  }

  if (!volunteerName) {
    showToast('Please enter your Volunteer Name', 'warning');
    document.getElementById('volunteerName').focus();
    return;
  }

  // Save volunteer name to preferences if changed
  if (volunteerName !== state.settings.defaultVolunteer) {
    state.settings.defaultVolunteer = volunteerName;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(state.settings));
  }

  // Collect checked actions
  const actions = [];
  document.querySelectorAll('input[name^="action"]:checked').forEach((chk) => {
    const label = chk.closest('.checkbox-item')?.querySelector('span')?.textContent || chk.name;
    actions.push(label.trim());
  });

  const selectedBoxInUse = document.querySelector('input[name="boxInUse"]:checked')?.value || 'Active Nest';

  const inspection = {
    id: 'insp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: new Date().toISOString(),
    boxCode: boxCode,
    trailArea: document.getElementById('trailArea').value,
    volunteerName: volunteerName,
    checkDateTime: document.getElementById('checkDateTime').value || new Date().toISOString(),
    gpsCoords: document.getElementById('gpsCoords').value || '',
    boxInUse: selectedBoxInUse,
    species: document.getElementById('species').value,
    nestStage: document.getElementById('nestStage').value,
    numEggs: parseInt(document.getElementById('numEggs').value || '0', 10),
    numChicks: parseInt(document.getElementById('numChicks').value || '0', 10),
    chickStage: document.getElementById('chickStage').value,
    numDead: parseInt(document.getElementById('numDead').value || '0', 10),
    numFledged: parseInt(document.getElementById('numFledged').value || '0', 10),
    actions: actions,
    comments: (document.getElementById('comments').value || '').trim(),
    synced: false,
    syncedAt: null
  };

  // Add to local state (Offline safety first!)
  state.inspections.unshift(inspection);
  saveInspections();

  // Reset counts and comments for next box
  resetFormFields();

  showToast(`✅ Box ${boxCode} saved locally!`, 'success');

  // If online & webhook is configured, sync in background
  if (navigator.onLine && state.settings.scriptUrl) {
    syncSingleInspection(inspection);
  } else if (!state.settings.scriptUrl) {
    showToast('Saved offline. Add Google Sheet Webhook in Settings to sync.', 'warning');
  } else {
    showToast('Saved offline. Will sync automatically when online.', 'warning');
  }

  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetFormFields() {
  document.getElementById('boxCode').value = '';
  document.getElementById('gpsCoords').value = '';
  document.getElementById('comments').value = '';

  // Reset steppers
  ['numEggs', 'numChicks', 'numDead', 'numFledged'].forEach((id) => {
    const input = document.getElementById(id);
    const display = document.getElementById(id.replace('num', 'val'));
    if (input) input.value = '0';
    if (display) display.textContent = '0';
  });

  // Reset Species & stages
  document.getElementById('species').selectedIndex = 0;
  document.getElementById('nestStage').selectedIndex = 0;
  document.getElementById('chickStage').selectedIndex = 0;

  // Uncheck maintenance except predator guard
  document.querySelectorAll('input[name^="action"]').forEach((chk) => {
    chk.checked = chk.name === 'actionPredatorGuard';
  });

  // Reset datetime to now
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  document.getElementById('checkDateTime').value = (new Date(now.getTime() - offset)).toISOString().slice(0, 16);
}

// ========================================================
// QR CODE SCANNER (CAMERA)
// ========================================================
function initScanner() {
  const btnOpen = document.getElementById('btnOpenScanner');
  const btnClose = document.getElementById('btnCloseScanner');
  const modal = document.getElementById('scannerModal');

  if (!btnOpen || !modal) return;

  btnOpen.addEventListener('click', () => {
    modal.classList.add('active');
    startQrScanner();
  });

  btnClose.addEventListener('click', () => {
    stopQrScanner();
    modal.classList.remove('active');
  });

  // Close modal when clicking backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      stopQrScanner();
      modal.classList.remove('active');
    }
  });
}

function startQrScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    showToast('QR Scanner engine loading...', 'warning');
    return;
  }

  try {
    state.html5QrCode = new Html5Qrcode('reader');
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    state.html5QrCode.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        // Scanned successfully!
        handleQrScanResult(decodedText);
        stopQrScanner();
        document.getElementById('scannerModal').classList.remove('active');
      },
      (error) => {
        // Continuous scan frame error, safely ignore
      }
    ).catch((err) => {
      console.warn('QR camera start failed:', err);
      showToast('Camera access denied or not available', 'danger');
    });
  } catch (e) {
    console.error('Scanner error:', e);
  }
}

function stopQrScanner() {
  if (state.html5QrCode) {
    state.html5QrCode.stop().then(() => {
      state.html5QrCode.clear();
      state.html5QrCode = null;
    }).catch((err) => {
      console.warn('Error stopping scanner:', err);
      state.html5QrCode = null;
    });
  }
}

function handleQrScanResult(text) {
  let boxVal = text.trim();

  // If text is a full URL (e.g., https://morainebirdtrail.app/?box=MSP-12)
  if (boxVal.startsWith('http://') || boxVal.startsWith('https://')) {
    try {
      const url = new URL(boxVal);
      const b = url.searchParams.get('box') || url.searchParams.get('b') || url.searchParams.get('id');
      const t = url.searchParams.get('trail') || url.searchParams.get('t');

      if (b) boxVal = b;
      if (t) {
        const trailSelect = document.getElementById('trailArea');
        if (trailSelect) {
          for (let i = 0; i < trailSelect.options.length; i++) {
            if (trailSelect.options[i].text.toLowerCase().includes(t.toLowerCase())) {
              trailSelect.selectedIndex = i;
              break;
            }
          }
        }
      }
    } catch (e) {
      // Keep plain text
    }
  }

  const boxInput = document.getElementById('boxCode');
  if (boxInput) {
    boxInput.value = boxVal;
    if (navigator.vibrate) navigator.vibrate(100);
    showToast(`📸 Box Scanned: ${boxVal}`, 'success');
  }
}

// ========================================================
// SYNC ENGINE & GOOGLE SHEETS WEBHOOK
// ========================================================
function initSyncEngine() {
  window.addEventListener('online', () => {
    state.isOnline = true;
    showToast('🌐 Internet connection restored', 'success');
    updateSyncStatus();
    syncAllPending();
  });

  window.addEventListener('offline', () => {
    state.isOnline = false;
    showToast('📵 Offline mode: inspections will save safely on device', 'warning');
    updateSyncStatus();
  });

  // Periodic background check every 60 seconds
  setInterval(() => {
    if (navigator.onLine && !state.isSyncing) {
      syncAllPending(false);
    }
  }, 60000);
}

function updateSyncStatus() {
  const pendingCount = state.inspections.filter(i => !i.synced).length;
  const banner = document.getElementById('statusBanner');
  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const queueText = document.getElementById('queueStatusText');
  const headerCount = document.getElementById('headerPendingCount');
  const tabBadge = document.getElementById('badgePending');

  if (headerCount) headerCount.textContent = pendingCount;
  if (tabBadge) {
    tabBadge.textContent = pendingCount;
    tabBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
  }

  if (!banner || !dot || !statusText || !queueText) return;

  if (state.isSyncing) {
    banner.className = 'status-banner syncing';
    dot.className = 'dot syncing';
    statusText.textContent = 'Syncing...';
    queueText.textContent = `Sending ${pendingCount} check(s) to Google Sheets`;
  } else if (!navigator.onLine) {
    banner.className = 'status-banner offline';
    dot.className = 'dot offline';
    statusText.textContent = 'Offline';
    queueText.textContent = pendingCount > 0 ? `${pendingCount} saved on phone (queued)` : 'Offline mode active';
  } else {
    banner.className = 'status-banner online';
    dot.className = 'dot online';
    statusText.textContent = 'Online';
    queueText.textContent = pendingCount > 0 ? `${pendingCount} pending sync` : 'All checks synced';
  }
}

async function syncSingleInspection(inspection) {
  if (!state.settings.scriptUrl || !navigator.onLine) return;

  try {
    const payload = JSON.stringify({
      action: 'log_inspection',
      inspection: inspection
    });

    // Use mode: 'no-cors' or standard POST for Google Apps Script Webhooks
    await fetch(state.settings.scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    });

    // Mark as synced locally
    const idx = state.inspections.findIndex(i => i.id === inspection.id);
    if (idx !== -1) {
      state.inspections[idx].synced = true;
      state.inspections[idx].syncedAt = new Date().toISOString();
      saveInspections();
    }
  } catch (err) {
    console.warn('Sync failed for inspection', inspection.id, err);
  }
}

async function syncAllPending(showManualFeedback = false) {
  const pending = state.inspections.filter(i => !i.synced);

  if (pending.length === 0) {
    if (showManualFeedback) {
      showToast('All checks are already synced!', 'success');
    }
    return;
  }

  if (!state.settings.scriptUrl) {
    if (showManualFeedback) {
      showToast('Please set your Google Apps Script URL in Settings', 'warning');
    }
    return;
  }

  if (!navigator.onLine) {
    if (showManualFeedback) {
      showToast('Cannot sync while offline. Connect to Wi-Fi/Cellular first.', 'warning');
    }
    return;
  }

  state.isSyncing = true;
  updateSyncStatus();

  let successCount = 0;

  try {
    // Send batch payload
    const payload = JSON.stringify({
      action: 'batch_log_inspections',
      inspections: pending
    });

    await fetch(state.settings.scriptUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    });

    // Mark all pending as synced
    const nowIso = new Date().toISOString();
    state.inspections.forEach((i) => {
      if (!i.synced) {
        i.synced = true;
        i.syncedAt = nowIso;
        successCount++;
      }
    });

    saveInspections();
    showToast(`☁️ Synced ${successCount} check(s) to Google Sheets!`, 'success');
  } catch (err) {
    console.error('Batch sync error:', err);
    showToast('Sync error. Checks are still saved safely on phone.', 'danger');
  } finally {
    state.isSyncing = false;
    updateSyncStatus();
  }
}

async function testWebhook() {
  const scriptInput = document.getElementById('scriptUrl');
  const url = (scriptInput.value || '').trim();

  if (!url) {
    showToast('Please enter a Google Apps Script URL first', 'warning');
    return;
  }

  showToast('Testing connection...', 'warning');

  try {
    const testData = JSON.stringify({
      action: 'ping',
      timestamp: new Date().toISOString(),
      volunteer: 'Connection Test'
    });

    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: testData
    });

    showToast('✅ Webhook reached! Check your Google Sheet.', 'success');
  } catch (err) {
    console.error('Test error:', err);
    showToast('Failed to connect to Google Apps Script URL', 'danger');
  }
}

// ========================================================
// HISTORY VIEW & CSV EXPORT
// ========================================================
function renderHistory() {
  const container = document.getElementById('historyList');
  if (!container) return;

  if (state.inspections.length === 0) {
    container.innerHTML = '<p class="text-center" style="color:var(--text-muted); padding:20px;">No inspections recorded yet on this device.</p>';
    return;
  }

  let html = '';
  state.inspections.forEach((item) => {
    const syncBadge = item.synced
      ? '<span class="history-sync-status synced">✓ Synced</span>'
      : '<span class="history-sync-status pending">⏳ Pending Sync</span>';

    const formattedDate = new Date(item.checkDateTime || item.timestamp).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    html += `
      <div class="history-item">
        <div class="history-item-header">
          <div>
            <span class="history-box-badge">${escapeHtml(item.boxCode)}</span>
            <span style="font-size:0.85rem; font-weight:600; color:var(--text-muted); margin-left:6px;">
              ${escapeHtml(item.trailArea || 'Trail')}
            </span>
          </div>
          ${syncBadge}
        </div>
        
        <div style="font-size:0.85rem; color:var(--text-main); margin-bottom:4px;">
          <strong>Species:</strong> ${escapeHtml(item.species)} • <strong>Status:</strong> ${escapeHtml(item.boxInUse)}
        </div>

        <div class="history-stats">
          <div>
            <div class="history-stat-label">Eggs</div>
            <div class="history-stat-val">${item.numEggs}</div>
          </div>
          <div>
            <div class="history-stat-label">Chicks</div>
            <div class="history-stat-val">${item.numChicks}</div>
          </div>
          <div>
            <div class="history-stat-label">Fledged</div>
            <div class="history-stat-val">${item.numFledged}</div>
          </div>
        </div>

        ${item.comments ? `<div style="font-size:0.8rem; color:#475569; margin-top:6px; font-style:italic;">"${escapeHtml(item.comments)}"</div>` : ''}

        <div style="font-size:0.75rem; color:var(--text-muted); margin-top:8px; display:flex; justify-content:space-between;">
          <span>By: ${escapeHtml(item.volunteerName)}</span>
          <span>${formattedDate}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function exportToCSV() {
  if (state.inspections.length === 0) {
    showToast('No inspections to export', 'warning');
    return;
  }

  const headers = [
    'Timestamp',
    'Box Number',
    'Trail / Area',
    'Volunteer Name',
    'Check Date & Time',
    'GPS Coordinates',
    'Box Status / In Use',
    'Species',
    'Nest Stage',
    'Number of Eggs',
    'Number of Chicks',
    'Chick Stage',
    'Dead Chicks',
    'Fledglings',
    'Actions Taken',
    'Comments',
    'Synced'
  ];

  const rows = state.inspections.map((i) => [
    i.timestamp,
    `"${(i.boxCode || '').replace(/"/g, '""')}"`,
    `"${(i.trailArea || '').replace(/"/g, '""')}"`,
    `"${(i.volunteerName || '').replace(/"/g, '""')}"`,
    i.checkDateTime,
    `"${(i.gpsCoords || '').replace(/"/g, '""')}"`,
    `"${(i.boxInUse || '').replace(/"/g, '""')}"`,
    `"${(i.species || '').replace(/"/g, '""')}"`,
    `"${(i.nestStage || '').replace(/"/g, '""')}"`,
    i.numEggs,
    i.numChicks,
    `"${(i.chickStage || '').replace(/"/g, '""')}"`,
    i.numDead,
    i.numFledged,
    `"${(i.actions || []).join(', ').replace(/"/g, '""')}"`,
    `"${(i.comments || '').replace(/"/g, '""')}"`,
    i.synced ? 'Yes' : 'No'
  ]);

  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Moraine_Bluebird_Checks_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast('📥 CSV downloaded successfully!', 'success');
}

// ========================================================
// TOAST NOTIFICATIONS & UTILITIES
// ========================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
