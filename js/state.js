/* WiFiMap — Constants, shared state, generic utilities. */

/* =========================================================
   WiFiMap — Wi-Fi Signal Mapper & Speed Certifier
   Single-page PWA. Live speed tests run against Cloudflare;
   demo mode and browser Wi-Fi radio estimates are simulated.
   ========================================================= */

const STORAGE_KEY = 'wifimap-state-v1';
const GAUGE_LEN = 251.4;

const state = {
  view: 'welcome',
  plan: null,            // { type: 'template' } | { type: 'image', src } | { type: 'custom', rooms, router }
  pins: [],              // { id, x, y (percent), room, ping, down, up }
  locked: false,
  paid: false,
  adminMode: false,      // paywall bypass, toggled from the admin panel
  testMode: 'live',      // 'live' = real measurement via Cloudflare, 'sim' = demo simulation
  ssid: 'Home Wi-Fi',    // network name shown in scan details (browsers cannot read the real SSID)
  propertyName: 'My Home Wi-Fi',
  certDate: null,
  certId: null,
};

let pendingUploadSrc = null;
let currentTest = null;   // { x, y, replaceId, ping, down, up, done }
let currentPinId = null;
let testRaf = null;
let deferredInstall = null;

/* ---------- utilities ---------- */
const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rand = (a, b) => a + Math.random() * (b - a);

function refreshIcons() { if (window.lucide) lucide.createIcons(); }

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 2600);
}

function speedColor(down) {
  if (down >= 100) return { hex: '#22c55e', name: 'Excellent', desc: 'Excellent — 4K streaming & remote work', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300', chip: 'bg-emerald-100 text-emerald-700' };
  if (down >= 30)  return { hex: '#f59e0b', name: 'Good', desc: 'Good — browsing, calls & HD streaming', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300', chip: 'bg-amber-100 text-amber-700' };
  return { hex: '#ef4444', name: 'Poor', desc: 'Poor connection — basic use only', cls: 'border-red-500/40 bg-red-500/10 text-red-300', chip: 'bg-red-100 text-red-700' };
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
