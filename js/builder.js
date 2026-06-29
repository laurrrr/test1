/* WiFiMap — Map creator: draw rooms, place router, build a custom plan. */

/* ---------- map creator (builder) ---------- */
const builder = { rooms: [], router: null, tool: 'room', drag: null, pendingRoom: null };

/* Blueprint-style SVG for custom plans (viewBox 800x560). `extra` lets the
   builder overlay its in-progress drag rectangle. */
function buildPlanSvg(rooms, router, extra = '') {
  const roomsSvg = (rooms || []).map(r => `
    <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="2" fill="rgba(103,183,232,.05)" stroke="#67b7e8" stroke-width="4"/>
    <text x="${r.x + r.w / 2}" y="${r.y + r.h / 2 + 6}" text-anchor="middle" fill="#7da8c9" font-size="16" font-weight="700" letter-spacing="2" font-family="ui-sans-serif,system-ui">${escapeHtml(r.name.toUpperCase())}</text>`).join('');
  const routerSvg = router ? `
    <g transform="translate(${router.x} ${router.y})">
      <circle r="11" fill="#22d3ee"/>
      <circle r="11" fill="none" stroke="#22d3ee" stroke-width="2" opacity=".45">
        <animate attributeName="r" values="11;24" dur="1.8s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values=".45;0" dur="1.8s" repeatCount="indefinite"/>
      </circle>
      <path d="M-5 1 a7 7 0 0 1 10 0 M-2 4 a3 3 0 0 1 4 0" stroke="#06303d" stroke-width="2" fill="none" stroke-linecap="round"/>
      <text y="32" text-anchor="middle" fill="#22d3ee" font-size="12" font-weight="700" font-family="ui-sans-serif,system-ui">ROUTER</text>
    </g>` : '';
  return `
<svg viewBox="0 0 800 560" class="block h-auto w-full" role="img" aria-label="Custom floor plan">
  <defs>
    <pattern id="cp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M20 0H0V20" fill="none" stroke="#13283f" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="800" height="560" fill="#081526"/>
  <rect width="800" height="560" fill="url(#cp-grid)"/>
  <rect x="4" y="4" width="792" height="552" fill="none" stroke="#1d3a57" stroke-width="2"/>
  ${roomsSvg}${routerSvg}${extra}
</svg>`;
}

function openBuilder() {
  builder.rooms = [];
  builder.router = null;
  builder.drag = null;
  builder.pendingRoom = null;
  showView('builder');
  setBuilderTool('room');
}

function setBuilderTool(tool) {
  builder.tool = tool;
  for (const t of ['room', 'router']) {
    const active = t === tool;
    $('tool-' + t).className = `inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold ${active
      ? 'border-violet-500 bg-violet-500/15 text-violet-300'
      : 'border-slate-700 text-slate-400 hover:border-slate-500'}`;
  }
  $('builder-hint').textContent = tool === 'room' ? 'Drag diagonally to draw a room' : 'Tap to place the router';
  renderBuilder();
}

function builderCoords(e) {
  const rect = $('builder-canvas').getBoundingClientRect();
  const x = clamp((e.clientX - rect.left) / rect.width * 800, 0, 800);
  const y = clamp((e.clientY - rect.top) / rect.height * 560, 0, 560);
  return { x: Math.round(x / 20) * 20, y: Math.round(y / 20) * 20 };
}

function renderBuilder() {
  let extra = '';
  if (builder.drag) {
    const d = builder.drag;
    const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1);
    const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
    extra = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="rgba(139,92,246,.12)" stroke="#a78bfa" stroke-width="3" stroke-dasharray="8 6"/>`;
  }
  if (builder.rooms.length === 0 && !builder.drag) {
    extra += `<text x="400" y="285" text-anchor="middle" fill="#33536f" font-size="20" font-weight="700" font-family="ui-sans-serif,system-ui">DRAG TO DRAW YOUR FIRST ROOM</text>`;
  }
  $('builder-canvas').innerHTML = buildPlanSvg(builder.rooms, builder.router, extra);
  const n = builder.rooms.length;
  $('builder-counter').textContent = `${n} room${n === 1 ? '' : 's'}`;
  $('btn-use-plan').disabled = n < 1;
}

function onBuilderDown(e) {
  if (state.view !== 'builder') return;
  e.preventDefault();
  const p = builderCoords(e);
  if (builder.tool === 'router') {
    builder.router = p;
    renderBuilder();
    toast('Router placed');
    return;
  }
  builder.drag = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
  $('builder-canvas').setPointerCapture(e.pointerId);
  renderBuilder();
}

function onBuilderMove(e) {
  if (!builder.drag) return;
  const p = builderCoords(e);
  builder.drag.x1 = p.x;
  builder.drag.y1 = p.y;
  renderBuilder();
}

function onBuilderUp() {
  if (!builder.drag) return;
  const d = builder.drag;
  builder.drag = null;
  const x = Math.min(d.x0, d.x1), y = Math.min(d.y0, d.y1);
  const w = Math.abs(d.x1 - d.x0), h = Math.abs(d.y1 - d.y0);
  if (w < 40 || h < 40) { renderBuilder(); return; }  // too small — treat as accidental tap
  builder.pendingRoom = { x, y, w, h };
  $('rn-input').value = '';
  $('rn-chips').innerHTML = ['Living Room', 'Bedroom 1', 'Bedroom 2', 'Workspace', 'Kitchen', 'Bath', 'Balcony']
    .map(r => `<button onclick="document.getElementById('rn-input').value='${r}'" class="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-violet-500 hover:text-violet-300">${r}</button>`).join('');
  openModal('modal-roomname');
  $('rn-input').focus();
  renderBuilder();
}

function saveRoomName() {
  if (!builder.pendingRoom) { closeModal('modal-roomname'); return; }
  const name = $('rn-input').value.trim() || `Room ${builder.rooms.length + 1}`;
  builder.rooms.push({ ...builder.pendingRoom, name });
  builder.pendingRoom = null;
  closeModal('modal-roomname');
  renderBuilder();
}

function cancelRoomName() {
  builder.pendingRoom = null;
  closeModal('modal-roomname');
  renderBuilder();
}

function builderUndo() {
  if (builder.rooms.length) builder.rooms.pop();
  else if (builder.router) builder.router = null;
  renderBuilder();
}

function builderClear() {
  builder.rooms = [];
  builder.router = null;
  renderBuilder();
  toast('Canvas cleared');
}

function useBuilderPlan() {
  if (builder.rooms.length < 1) return;
  state.plan = { type: 'custom', rooms: builder.rooms.map(r => ({ ...r })), router: builder.router ? { ...builder.router } : null };
  state.pins = [];
  state.locked = false;
  state.paid = false;
  state.certDate = null;
  state.certId = null;
  showMapping();
  toast(builder.router ? 'Custom plan ready — tap a room to test' : 'Custom plan ready (no router placed — assuming center)');
}
