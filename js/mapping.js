/* WiFiMap — Interactive coverage map: render plan, pins, room list, toolbar. */

/* ---------- mapping ---------- */
function showMapping() {
  showView('mapping');
  renderPlan();
  renderPins();
  updateToolbar();
  updateTestModeBtn();
  $('ssid-input').value = state.ssid || '';
  renderSsidDatalist();
  // Auto-collect the real SSID in the native apps (the snapshot may arrive a
  // moment later on iOS, so retry once).
  if (IS_NATIVE && !prefillSsidFromNative()) setTimeout(prefillSsidFromNative, 800);
}

function toggleTestMode() {
  state.testMode = state.testMode === 'live' ? 'sim' : 'live';
  persist();
  updateTestModeBtn();
  toast(state.testMode === 'live' ? 'Live mode — real measurements via Cloudflare' : 'Demo mode — simulated measurements');
}

function updateTestModeBtn() {
  const live = state.testMode === 'live';
  $('btn-testmode').innerHTML = live
    ? '<i data-lucide="zap" class="h-3.5 w-3.5 text-emerald-400"></i> Live test'
    : '<i data-lucide="flask-conical" class="h-3.5 w-3.5 text-amber-400"></i> Demo mode';
  refreshIcons();
}

/* Markup for the current floor plan, reused by the map and the certificate. */
function planMarkup() {
  if (!state.plan) return '';
  if (state.plan.type === 'template') return TEMPLATE_SVG;
  if (state.plan.type === 'custom') return buildPlanSvg(state.plan.rooms, planRouters(state.plan));
  return `<img src="${state.plan.src}" alt="Floor plan" class="block h-auto w-full" draggable="false" />`;
}

function renderPlan() {
  if (!state.plan) return;
  $('plan-holder').innerHTML = planMarkup();
  $('map-wrap').classList.toggle('locked', state.locked);
}

function pinMarkup(pin, index, interactive) {
  const c = speedColor(pin.down);
  const halo = `<span class="absolute h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full"
      style="left:0;top:0;background:radial-gradient(circle, ${c.hex}59 0%, ${c.hex}26 45%, transparent 70%)"></span>`;
  const dot = `
    <span class="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-[11px] font-extrabold text-white shadow-lg ${interactive ? 'animate-pinDrop' : ''}"
      style="left:0;top:0;background:${c.hex}">${index + 1}</span>
    <span class="absolute -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-950/85 px-1.5 py-0.5 text-[10px] font-bold text-white shadow"
      style="left:0;top:16px">${escapeHtml(pin.room)} · ${pin.down}↓</span>`;
  return `<div class="pin-marker absolute" style="left:${pin.x}%;top:${pin.y}%" data-pin="${pin.id}">${halo}${dot}</div>`;
}

function renderPins() {
  const layer = $('pin-layer');
  layer.innerHTML = state.pins.map((p, i) => pinMarkup(p, i, true)).join('');
  layer.querySelectorAll('.pin-marker').forEach(el => {
    el.addEventListener('click', (e) => { e.stopPropagation(); openPinModal(el.dataset.pin); });
  });
  renderRoomList();
}

function renderRoomList() {
  const list = $('room-list');
  $('room-list-empty').classList.toggle('hidden', state.pins.length > 0);
  list.innerHTML = state.pins.map((p, i) => {
    const c = speedColor(p.down);
    return `
      <button onclick="openPinModal('${p.id}')" class="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-left transition hover:border-slate-600">
        <span class="flex items-center gap-2.5 min-w-0">
          <span class="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-extrabold text-white" style="background:${c.hex}">${i + 1}</span>
          <span class="truncate text-sm font-semibold">${escapeHtml(p.room)}</span>
        </span>
        <span class="shrink-0 text-xs font-bold" style="color:${c.hex}">${p.down} Mbps</span>
      </button>`;
  }).join('');
}

function updateToolbar() {
  const n = state.pins.length;
  $('pin-counter').textContent = `${n} pin${n === 1 ? '' : 's'}`;
  const btn = $('btn-certificate');
  btn.disabled = n < 3 || state.locked;
  btn.title = n < 3 ? `Drop ${3 - n} more pin${3 - n === 1 ? '' : 's'} to unlock` : '';
  $('locked-banner').classList.toggle('hidden', !state.locked);
  $('locked-banner').classList.toggle('flex', state.locked);
  $('map-wrap').classList.toggle('locked', state.locked);
  persist();
}
