/* WiFiMap — localStorage persistence + session resume. */

/* ---------- persistence ---------- */
function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      plan: state.plan, pins: state.pins, locked: state.locked, paid: state.paid,
      adminMode: state.adminMode, testMode: state.testMode, ssid: state.ssid,
      propertyName: state.propertyName, certDate: state.certDate, certId: state.certId,
      savedAt: Date.now(),
    }));
  } catch (e) { /* storage full (large image) — non-fatal */ }
}

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
}

function resumeSession() {
  const s = loadSaved();
  if (!s || !s.plan) return;
  Object.assign(state, {
    plan: s.plan, pins: s.pins || [], locked: !!s.locked, paid: !!s.paid,
    adminMode: !!s.adminMode, testMode: s.testMode || 'live', ssid: s.ssid || state.ssid,
    propertyName: s.propertyName || state.propertyName, certDate: s.certDate, certId: s.certId,
  });
  updateAdminChip();
  $('property-name').value = state.propertyName;
  state.locked ? showCertificate() : showMapping();
}

function discardSession() {
  localStorage.removeItem(STORAGE_KEY);
  $('resume-banner').classList.add('hidden');
  toast('Saved session discarded');
}
