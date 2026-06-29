/* WiFiMap — View switching, home nav, generic modal open/close. */

/* ---------- views ---------- */
function showView(name) {
  state.view = name;
  for (const v of ['welcome', 'mapping', 'certificate', 'builder', 'admin']) {
    $('view-' + v).classList.toggle('hidden', v !== name);
  }
  const labels = { welcome: 'Dashboard', mapping: 'Mapping mode', certificate: 'Certificate', builder: 'Map creator', admin: 'Admin' };
  $('header-status-text').textContent = labels[name];
  $('header-status').classList.remove('hidden');
  window.scrollTo({ top: 0 });
  refreshIcons();
}

function goHome() { showView('welcome'); checkResumeBanner(); }

function checkResumeBanner() {
  const s = loadSaved();
  const has = s && s.plan && (s.pins || []).length > 0;
  $('resume-banner').classList.toggle('hidden', !has);
  if (has) {
    $('resume-meta').textContent = `${s.pins.length} pin${s.pins.length === 1 ? '' : 's'} · ${s.locked ? 'certificate ready' : 'in progress'}`;
  }
}

/* ---------- modals ---------- */
function openModal(id) {
  const m = $(id);
  m.classList.remove('hidden');
  m.classList.add('flex');
  refreshIcons();
}
function closeModal(id) {
  const m = $(id);
  m.classList.add('hidden');
  m.classList.remove('flex');
}
