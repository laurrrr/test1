/* WiFiMap — Signal model, native Wi-Fi bridge, per-scan detail rendering. */

/* Routers/access points for a plan, in viewBox (800x560) coordinates.
   Supports multiple APs; tolerates the legacy single-`router` shape. */
function planRouters(plan) {
  if (!plan) return [];
  if (Array.isArray(plan.routers)) return plan.routers;
  if (plan.router) return [plan.router];   // legacy saved sessions
  return [];
}

/* Router positions as map percentages. Custom plans use their placed APs;
   every other plan assumes a single central router. */
function routerPositions() {
  if (state.plan && state.plan.type === 'custom') {
    const rs = planRouters(state.plan);
    if (rs.length) return rs.map(r => ({ x: r.x / 8, y: r.y / 5.6 }));  // viewBox → percent
  }
  return [{ x: 48.75, y: 44.6 }];
}

/* Distance to the nearest access point — a phone associates with whichever
   AP is strongest, so coverage is driven by the closest one (mesh/multi-AP). */
function nearestRouterDist(x, y) {
  return Math.min(...routerPositions().map(r => Math.hypot(x - r.x, y - r.y)));
}

/* Simulated signal model: speed decays with distance from the nearest router. */
function signalAt(x, y) {
  const d = nearestRouterDist(x, y);
  const down = clamp(Math.round(235 - 2.9 * d + rand(-18, 18)), 8, 240);
  const up = clamp(Math.round(down * rand(0.38, 0.5)), 3, 120);
  const ping = Math.round(6 + 0.45 * d + rand(0, 6));
  return { ping, down, up };
}

/* Access-point channels, stable per network name so they don't change between scans. */
function apChannels() {
  let h = 0;
  for (const ch of (state.ssid || 'Home Wi-Fi')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return { c24: [1, 6, 11][h % 3], c5: [36, 40, 44, 48, 149, 153, 157, 161][h % 8] };
}

/* Wi-Fi radio details modeled from distance to the router. Browsers cannot
   read the real SSID/channel/RSSI, so these are estimates even in live mode. */
function radioDetailsAt(x, y) {
  const d = nearestRouterDist(x, y);
  const rssi = Math.round(clamp(-32 - d * 0.62 - rand(0, 4), -92, -30));
  const band = rssi > -65 ? '5 GHz' : '2.4 GHz';
  const ch = apChannels();
  return {
    rssi,
    band,
    channel: band === '5 GHz' ? ch.c5 : ch.c24,
    width: band === '5 GHz' ? (rssi > -55 ? '80 MHz' : '40 MHz') : '20 MHz',
    security: 'WPA2/WPA3',
  };
}

/* ---------- native bridge (Android WebView) ---------- */
/* Inside the Android app, MainActivity injects `window.WifiNative`, which
   exposes real radio telemetry from WifiManager. When present, scans use
   measured data and no estimation happens. */
const IS_NATIVE = !!window.WifiNative;

function nativeWifiInfo() {
  if (!IS_NATIVE) return null;
  try {
    const d = JSON.parse(window.WifiNative.getWifiInfo());
    if (d && d.available) return d;
    return d && d.reason ? { failed: true, reason: d.reason } : null;
  } catch (e) { return null; }
}

/* window.print() is a no-op in Android WebView; the bridge routes it to the
   system print dialog instead. */
function doPrint() {
  try {
    if (IS_NATIVE && typeof window.WifiNative.printPage === 'function') {
      window.WifiNative.printPage();
      return;
    }
  } catch (e) { /* fall through to browser print */ }
  window.print();
}

/* Browser-reported link info (Network Information API, where supported). */
function deviceLink() {
  const c = navigator.connection;
  if (!c) return null;
  const parts = [];
  if (c.type) parts.push(c.type);
  if (c.effectiveType) parts.push(c.effectiveType);
  if (c.downlink) parts.push('~' + c.downlink + ' Mbps');
  return parts.join(' · ') || null;
}

/* Shared key/value grid for the speedtest result and pin details modals.
   Radio fields are real when captured through the native Android bridge
   (badged "✓"); in the browser they come from the signal model and live
   scans badge them "est." since browsers cannot read Wi-Fi radio data. */
function scanDetailsHtml(p) {
  const est = p.radioReal
    ? ' <span class="text-[9px] text-emerald-500" title="Measured on-device via Android WifiManager">✓</span>'
    : (p.source === 'live'
      ? ' <span class="text-[9px] text-slate-600" title="Browsers cannot read Wi-Fi radio data — estimated from the signal model">est.</span>'
      : '');
  const sigPct = p.sigPct != null ? p.sigPct : (p.rssi != null ? clamp(Math.round(2 * (p.rssi + 100)), 0, 100) : null);
  const rows = [];
  rows.push(['Network (SSID)', escapeHtml(state.ssid || 'Home Wi-Fi'), p.radioReal ? est : '']);
  if (p.jitter != null) rows.push(['Jitter', p.jitter + ' ms', '']);
  if (p.rssi != null) rows.push(['Signal strength', `${p.rssi} dBm (${sigPct}%)`, est]);
  if (p.band) rows.push(['Band', p.band, est]);
  if (p.channel) rows.push(['Channel', p.channel, est]);
  if (p.width) rows.push(['Channel width', p.width, est]);
  if (p.security) rows.push(['Security', p.security, est]);
  if (p.linkSpeed) rows.push(['Link speed', p.linkSpeed + ' Mbps', est]);
  if (p.standard) rows.push(['Wi-Fi standard', escapeHtml(p.standard), est]);
  if (p.freq) rows.push(['Frequency', p.freq + ' MHz', est]);
  if (p.bssid) rows.push(['BSSID (AP)', `<span class="font-mono">${escapeHtml(p.bssid)}</span>`, est]);
  if (p.isp) rows.push(['ISP', escapeHtml(p.isp), '']);
  if (p.server) rows.push(['Test server', escapeHtml(p.server), '']);
  if (p.netType) rows.push(['Device link', escapeHtml(p.netType), '']);
  if (rows.length <= 1) return '';
  return `<div class="grid grid-cols-2 gap-1.5 text-xs">` + rows.map(([k, v, badge]) => `
    <div class="flex items-baseline justify-between gap-2 rounded-lg bg-slate-950 px-2.5 py-1.5">
      <span class="shrink-0 text-slate-500">${k}${badge}</span>
      <span class="truncate text-right font-semibold text-slate-200" title="${String(v).replace(/"/g, '&quot;')}">${v}</span>
    </div>`).join('') + '</div>';
}
