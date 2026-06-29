/* WiFiMap — Admin panel: passcode gate, stats, paywall bypass. */

/* ---------- admin ---------- */
const ADMIN_PASS = 'admin';
let adminAuthed = sessionStorage.getItem('wifimap-admin') === '1';

function showAdmin() {
  showView('admin');
  renderAdmin();
}

function adminLogin() {
  if ($('admin-pass').value.trim().toLowerCase() === ADMIN_PASS) {
    adminAuthed = true;
    sessionStorage.setItem('wifimap-admin', '1');
    toast('Admin unlocked');
    renderAdmin();
  } else {
    toast('Wrong passcode');
  }
  $('admin-pass').value = '';
}

function updateAdminChip() {
  $('admin-chip').classList.toggle('hidden', !state.adminMode);
}

function renderAdmin() {
  $('admin-gate').classList.toggle('hidden', adminAuthed);
  $('admin-panel').classList.toggle('hidden', !adminAuthed);
  if (!adminAuthed) { refreshIcons(); return; }

  const pins = state.pins;
  $('adm-pins').textContent = pins.length;
  $('adm-avg').textContent = pins.length ? Math.round(pins.reduce((s, p) => s + p.down, 0) / pins.length) : '—';
  $('adm-cert').textContent = state.certDate ? 'Issued' : '—';
  $('adm-revenue').textContent = state.paid ? '$5' : '$0';
  $('adm-property').textContent = state.propertyName || '—';
  $('adm-plan').textContent = state.plan ? ({ template: 'Template', image: 'Uploaded image', custom: 'Custom (map creator)' })[state.plan.type] : 'None';
  $('adm-paid').textContent = state.paid ? 'Yes' : 'No';
  $('adm-certid').textContent = state.certId || '—';

  const t = $('adm-toggle');
  t.className = `mt-4 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold ${state.adminMode
    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300'
    : 'border-slate-700 text-slate-300 hover:border-slate-500'}`;
  t.innerHTML = state.adminMode
    ? '<i data-lucide="toggle-right" class="h-5 w-5"></i> Bypass enabled — certificates are free'
    : '<i data-lucide="toggle-left" class="h-5 w-5"></i> Bypass disabled — enable free downloads';

  const canCert = state.plan && state.pins.length >= 3;
  $('adm-open-cert').disabled = !canCert;
  $('adm-cert-note').textContent = canCert ? '' : 'Needs an active floor plan with at least 3 tested pins.';
  refreshIcons();
}

function toggleAdminMode() {
  state.adminMode = !state.adminMode;
  persist();
  updateAdminChip();
  renderAdmin();
  toast(state.adminMode ? 'Paywall bypass ON' : 'Paywall bypass OFF');
}

function adminOpenCertificate() {
  if (!state.plan || state.pins.length < 3) return;
  if (!state.adminMode) { state.adminMode = true; updateAdminChip(); }
  state.locked = true;
  state.certDate = state.certDate || new Date().toISOString();
  state.certId = state.certId || ('WFM-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase());
  showCertificate();
}

function adminReset() {
  localStorage.removeItem(STORAGE_KEY);
  Object.assign(state, { plan: null, pins: [], locked: false, paid: false, adminMode: false, certDate: null, certId: null, propertyName: 'My Home Wi-Fi' });
  $('property-name').value = state.propertyName;
  updateAdminChip();
  renderAdmin();
  toast('All app data reset');
}
