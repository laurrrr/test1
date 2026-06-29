/* WiFiMap — Certificate generation, star rating, render, lock/unlock. */

/* ---------- certificate ---------- */
function starsFor(avgDown) {
  if (avgDown >= 150) return 5;
  if (avgDown >= 100) return 4.5;
  if (avgDown >= 70) return 4;
  if (avgDown >= 50) return 3.5;
  if (avgDown >= 30) return 3;
  if (avgDown >= 15) return 2;
  return 1;
}

function generateCertificate() {
  if (state.pins.length < 3) return;
  state.locked = true;
  state.certDate = state.certDate || new Date().toISOString();
  state.certId = state.certId || ('WFM-' + Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase());
  showCertificate();
  toast('Certificate generated — editing locked');
}

function showCertificate() {
  if (!state.certDate) { generateCertificate(); return; }
  showView('certificate');
  renderCertificate();
  persist();
}

function unlockEditing() {
  state.locked = false;
  showMapping();
  toast('Editing unlocked — re-generate the certificate when done');
}

function renderCertificate() {
  const pins = state.pins;
  // Average only the numeric values so a pin with a missing upload (live
  // upload step failed) doesn't poison the result with NaN.
  const avg = (key) => {
    const vals = pins.map(p => p[key]).filter(v => Number.isFinite(v));
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  };
  const avgDown = avg('down'), avgUp = avg('up'), avgPing = avg('ping');

  $('cert-property').textContent = state.propertyName || 'My Wi-Fi';
  $('cert-date').textContent = new Date(state.certDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  $('cert-ssid').textContent = state.ssid || 'Home Wi-Fi';
  $('cert-id').textContent = state.certId;
  $('cert-id-footer').textContent = state.certId + ' · wifimap.app/verify';
  $('cert-avg-down').textContent = avgDown == null ? '—' : avgDown;
  $('cert-avg-up').textContent = avgUp == null ? '—' : avgUp;
  $('cert-avg-ping').textContent = avgPing == null ? '—' : avgPing;

  const allLive = pins.length > 0 && pins.every(p => p.source === 'live');
  const allNative = pins.length > 0 && pins.every(p => p.radioReal);
  $('cert-method').innerHTML = `<i data-lucide="badge-check" class="h-4 w-4 text-emerald-600"></i> ${
    allNative && allLive ? 'Speeds via Cloudflare · radio telemetry captured on-device.'
    : allLive ? 'Measured on-site via Cloudflare’s global speed test network.'
    : 'Measured on-site with WiFiMap signal mapping technology.'}`;

  // stars
  const stars = starsFor(avgDown);
  let starHtml = '';
  for (let i = 1; i <= 5; i++) {
    if (stars >= i) starHtml += `<i data-lucide="star" class="h-5 w-5 fill-amber-400 text-amber-400"></i>`;
    else if (stars >= i - 0.5) starHtml += `<i data-lucide="star-half" class="h-5 w-5 fill-amber-400 text-amber-400"></i>`;
    else starHtml += `<i data-lucide="star" class="h-5 w-5 text-slate-300"></i>`;
  }
  $('cert-stars').innerHTML = starHtml + `<span class="ml-1.5 text-sm font-bold text-slate-700">${stars.toFixed(1)} / 5.0</span>`;

  // map snapshot (read-only)
  const certMap = $('cert-map');
  certMap.innerHTML = `
    <div class="relative">
      ${planMarkup()}
      <div class="absolute inset-0">${pins.map((p, i) => pinMarkup(p, i, false)).join('')}</div>
    </div>`;

  // table
  $('cert-table').innerHTML = pins.map((p, i) => {
    const c = speedColor(p.down);
    return `
      <tr class="border-b border-slate-100">
        <td class="py-2.5 pr-2 font-bold text-slate-400">${i + 1}</td>
        <td class="py-2.5 pr-2 font-semibold">${escapeHtml(p.room)}</td>
        <td class="py-2.5 pr-2 text-right tabular-nums">${p.ping} ms</td>
        <td class="py-2.5 pr-2 text-right font-bold tabular-nums">${p.down} Mbps</td>
        <td class="py-2.5 pr-2 text-right tabular-nums">${p.up == null ? '—' : p.up + ' Mbps'}</td>
        <td class="py-2.5 pr-2 text-right tabular-nums">${p.rssi != null ? `${p.rssi} dBm` : '—'}${p.band ? `<span class="block text-[10px] text-slate-400">${p.band} · ch ${p.channel}</span>` : ''}</td>
        <td class="py-2.5 text-right"><span class="rounded-full px-2 py-0.5 text-[11px] font-bold ${c.chip}">${c.name}</span></td>
      </tr>`;
  }).join('');

  // watermark + download button state (admin mode bypasses the paywall)
  const wm = $('cert-watermark');
  if (state.paid || state.adminMode) {
    wm.innerHTML = '';
    wm.style.display = 'none';
    $('btn-download-label').textContent = state.paid ? 'Download / Print Certificate' : 'Download PDF (Admin — free)';
    $('watermark-note').innerHTML = state.paid
      ? `<i data-lucide="badge-check" class="inline h-3.5 w-3.5 -mt-0.5 text-emerald-400"></i> Official certificate unlocked — watermark removed. Use your browser's print dialog to save as PDF.`
      : `<i data-lucide="shield" class="inline h-3.5 w-3.5 -mt-0.5 text-violet-400"></i> Admin paywall bypass active — watermark removed, downloads are free.`;
  } else {
    wm.style.display = 'flex';
    wm.innerHTML = Array.from({ length: 12 }, () => '<span>WIFIMAP · PREVIEW</span>').join('');
    $('btn-download-label').textContent = 'Download Official PDF ($5)';
    $('watermark-note').innerHTML = `<i data-lucide="info" class="inline h-3.5 w-3.5 -mt-0.5"></i> The preview is watermarked. Purchase the official certificate to remove the watermark and download a print-ready PDF.`;
  }
  refreshIcons();
}
