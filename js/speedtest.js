/* WiFiMap — Speed test: live Cloudflare measurement + simulated animation. */

/* ---------- speed test ---------- */
function onMapTap(e) {
  if (!state.plan || state.view !== 'mapping') return;
  if (state.locked) { toast('Editing is locked — unlock to add more pins'); return; }
  const rect = $('map-wrap').getBoundingClientRect();
  const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 1, 99);
  const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 1, 99);
  openSpeedtest(x, y, null);
}

function openSpeedtest(x, y, replaceId) {
  currentTest = { x, y, replaceId, done: false, source: state.testMode };

  $('st-title').textContent = replaceId ? 'Re-testing location' : `Speed Test — Pin #${state.pins.length + 1}`;
  $('st-result').classList.add('hidden');
  $('m-ping').textContent = '—';
  $('m-down').textContent = '—';
  $('m-up').textContent = '—';
  $('gauge-value').textContent = '0';
  $('gauge-unit').textContent = 'ms';
  $('gauge-arc').style.strokeDashoffset = GAUGE_LEN;
  $('st-progress').style.width = '0%';
  $('st-status').textContent = 'Connecting to test server…';
  setActiveTile(null);

  const existing = replaceId ? state.pins.find(p => p.id === replaceId) : null;
  $('st-room').value = existing ? existing.room : '';
  $('st-room-chips').innerHTML = ['Living Room', 'Bedroom 1', 'Bedroom 2', 'Workspace', 'Kitchen', 'Balcony']
    .map(r => `<button onclick="document.getElementById('st-room').value='${r}'" class="rounded-full border border-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-cyan-500 hover:text-cyan-300">${r}</button>`).join('');

  openModal('modal-speedtest');
  if (state.testMode === 'live') startLiveTest(x, y);
  else runTestAnimation(signalAt(x, y));
}

/* ---------- live measurement via Cloudflare (speed.cloudflare.com) ---------- */
const CF = 'https://speed.cloudflare.com';
let liveAbort = null;
let liveTimedOut = false;   // distinguishes a watchdog abort from the user closing the modal

function setProgress(pct) { $('st-progress').style.width = clamp(pct, 0, 100) + '%'; }

function liveTick(key, value, max) {
  const v = Math.max(0, Math.round(value));
  $('m-' + key).textContent = v;
  $('gauge-value').textContent = v;
  $('gauge-arc').style.strokeDashoffset = GAUGE_LEN * (1 - clamp(v / max, 0, 1));
}

async function startLiveTest(x, y) {
  liveAbort = new AbortController();
  liveTimedOut = false;
  const signal = liveAbort.signal;
  // Watchdog: never hang forever — abort the whole test after 22s.
  const watchdog = setTimeout(() => { liveTimedOut = true; liveAbort.abort(); }, 22000);
  const metaPromise = fetchMeta(signal);   // best-effort; never throws (see fetchMeta)
  try {
    // --- latency (essential; one retry before giving up) ---
    setActiveTile('ping');
    $('st-status').textContent = 'Measuring latency (Cloudflare)…';
    $('gauge-unit').textContent = 'ms';
    setProgress(5);
    let lat;
    try {
      lat = await cfLatency(signal, v => liveTick('ping', v, 100));
    } catch (e) {
      if (signal.aborted) throw e;
      lat = await cfLatency(signal, v => liveTick('ping', v, 100));   // single retry
    }
    liveTick('ping', lat.ping, 100);
    setProgress(15);

    // --- download (essential) ---
    setActiveTile('down');
    $('st-status').textContent = 'Testing download (Cloudflare)…';
    $('gauge-unit').textContent = 'Mbps';
    const down = Math.max(1, Math.round(await cfDownload(signal, (v, frac) => {
      liveTick('down', v, 300);
      setProgress(15 + frac * 55);
    })));
    $('m-down').textContent = down;
    setProgress(70);

    // --- upload (optional: a failure here must NOT discard a good download) ---
    let up = null;
    try {
      setActiveTile('up');
      $('st-status').textContent = 'Testing upload (Cloudflare)…';
      up = Math.max(1, Math.round(await cfUpload(signal, (v, frac) => {
        liveTick('up', v, 150);
        setProgress(70 + frac * 30);
      })));
      liveTick('up', up, 150);   // settle on the measured value
    } catch (e) {
      if (signal.aborted) throw e;   // user closed / watchdog — bail to outer catch
      console.warn('WiFiMap: upload step failed —', e);
      $('m-up').textContent = '—';
      toast('Upload step unavailable — saved download & ping');
    }

    await metaPromise;
    clearTimeout(watchdog);
    finishTest({ ping: lat.ping, down, up, jitter: lat.jitter });
  } catch (err) {
    clearTimeout(watchdog);
    if (signal.aborted && !liveTimedOut) return;   // user closed the modal mid-test
    const reason = liveTimedOut ? 'timed out' : ((err && err.message) || 'network blocked');
    console.warn('WiFiMap: live test failed —', err,
      '\nIf this persists, check that speed.cloudflare.com is reachable (corporate proxy, VPN, ad-blocker or offline can block it).');
    toast('Live test unavailable (' + reason + ') — using simulation');
    if (!currentTest) return;
    currentTest.source = 'sim';
    runTestAnimation(signalAt(x, y));
  } finally {
    liveAbort = null;
  }
}

/* Median round-trip time + jitter (mean successive difference); the first
   request warms up the connection and is dropped. */
async function cfLatency(signal, onTick) {
  const samples = [];
  for (let i = 0; i < 6; i++) {
    const t0 = performance.now();
    await fetch(`${CF}/__down?bytes=0&r=${Date.now()}${i}`, { signal, cache: 'no-store' });
    const ms = performance.now() - t0;
    if (i > 0) { samples.push(ms); onTick(Math.min(...samples)); }
  }
  let jit = 0;
  for (let i = 1; i < samples.length; i++) jit += Math.abs(samples[i] - samples[i - 1]);
  const jitter = Math.max(1, Math.round(jit / (samples.length - 1)));
  samples.sort((a, b) => a - b);
  return { ping: Math.max(1, Math.round(samples[Math.floor(samples.length / 2)])), jitter };
}

/* Cloudflare /meta: public IP, ISP (AS organization) and which edge served us. */
let cfMeta = null;
async function fetchMeta(signal) {
  if (cfMeta) return cfMeta;
  try {
    const res = await fetch(`${CF}/meta`, { signal, cache: 'no-store' });
    cfMeta = await res.json();
  } catch (e) { /* optional enrichment — ignore failures */ }
  return cfMeta;
}

/* Stream progressively larger payloads for up to ~5s; report instantaneous
   throughput while reading and return the fastest sustained transfer. */
async function cfDownload(signal, onTick) {
  const BUDGET_MS = 5000;
  const sizes = [2e6, 10e6, 25e6, 50e6];
  const speeds = [];
  const t0 = performance.now();
  for (const size of sizes) {
    const f0 = performance.now();
    const res = await fetch(`${CF}/__down?bytes=${size}&r=${Date.now()}`, { signal, cache: 'no-store' });
    const reader = res.body.getReader();
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      const el = (performance.now() - f0) / 1000;
      if (el > 0.12) onTick((received * 8 / 1e6) / el, clamp((performance.now() - t0) / BUDGET_MS, 0, 1));
    }
    const el = (performance.now() - f0) / 1000;
    if (el > 0.05) speeds.push((received * 8 / 1e6) / el);
    if (performance.now() - t0 > BUDGET_MS) break;
  }
  if (!speeds.length) throw new Error('no download samples');
  return Math.max(...speeds);
}

/* POST a payload and time it. We deliberately use fetch (not XHR): attaching
   an `xhr.upload` progress listener flips the request to "non-simple", which
   forces a CORS preflight OPTIONS that speed.cloudflare.com's /__up does not
   satisfy — the exact reason uploads came back "unavailable" while the
   download (a plain GET) worked. A Uint8Array body sets no Content-Type, so
   this stays a simple cross-origin request like the download. fetch exposes
   no upload progress, so the gauge is animated optimistically meanwhile. */
async function cfUpload(signal, onTick) {
  const size = 5e6;
  const payload = new Uint8Array(size);
  const t0 = performance.now();

  // Optimistic gauge motion while the POST is in flight (eases toward a soft
  // cap; the real measured value replaces it the moment the request settles).
  const ticker = setInterval(() => {
    const el = (performance.now() - t0) / 1000;
    onTick(8 + easeOutCubic(clamp(el / 4, 0, 1)) * 60, clamp(el / 4, 0, 0.95));
  }, 150);

  try {
    await fetch(`${CF}/__up?r=${Date.now()}`, { method: 'POST', body: payload, signal, cache: 'no-store' });
  } finally {
    clearInterval(ticker);
  }
  const el = (performance.now() - t0) / 1000;
  if (!(el > 0)) throw new Error('upload too fast to time');
  return (size * 8 / 1e6) / el;
}

function setActiveTile(which) {
  for (const t of ['ping', 'down', 'up']) {
    const active = t === which;
    $('tile-' + t).classList.toggle('border-cyan-500/60', active);
    $('tile-' + t).classList.toggle('bg-cyan-500/5', active);
  }
}

function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

function runTestAnimation(target) {
  cancelAnimationFrame(testRaf);
  const phases = [
    { key: 'ping', dur: 900,  label: 'Measuring latency…',        unit: 'ms',   max: 100, target: target.ping },
    { key: 'down', dur: 1600, label: 'Testing download speed…',   unit: 'Mbps', max: 240, target: target.down },
    { key: 'up',   dur: 1300, label: 'Testing upload speed…',     unit: 'Mbps', max: 240, target: target.up },
  ];
  const total = phases.reduce((s, p) => s + p.dur, 0);
  const start = performance.now();

  function frame(now) {
    const elapsed = now - start;
    let acc = 0, phase = null, t = 1;
    for (const p of phases) {
      if (elapsed < acc + p.dur) { phase = p; t = (elapsed - acc) / p.dur; break; }
      acc += p.dur;
      $('m-' + p.key).textContent = p.target;   // settle finished phases
    }

    $('st-progress').style.width = Math.min(100, (elapsed / total) * 100) + '%';

    if (!phase) {  // finished
      finishTest(target);
      return;
    }

    setActiveTile(phase.key);
    $('st-status').textContent = phase.label;
    $('gauge-unit').textContent = phase.unit;

    const eased = easeOutCubic(t);
    const jitter = (1 - t) * phase.target * 0.18 * (Math.random() - 0.5);
    const value = Math.max(0, Math.round(phase.target * eased + jitter));
    $('m-' + phase.key).textContent = value;
    $('gauge-value').textContent = value;
    $('gauge-arc').style.strokeDashoffset = GAUGE_LEN * (1 - clamp(value / phase.max, 0, 1));

    testRaf = requestAnimationFrame(frame);
  }
  testRaf = requestAnimationFrame(frame);
}

function finishTest(target) {
  // Radio details: real (native Android bridge) when available, modeled otherwise.
  let radio;
  const native = nativeWifiInfo();
  if (native && !native.failed) {
    radio = {
      rssi: native.rssi,
      sigPct: native.signalPercent != null ? clamp(native.signalPercent, 0, 100) : undefined,
      band: native.band || undefined,
      channel: native.channel > 0 ? native.channel : undefined,
      width: native.width || undefined,
      security: native.security || undefined,
      bssid: native.bssid || undefined,
      linkSpeed: native.linkSpeedMbps > 0 ? native.linkSpeedMbps : undefined,
      standard: native.standard || undefined,
      freq: native.frequencyMhz > 0 ? native.frequencyMhz : undefined,
      radioReal: true,
    };
    if (native.ssid && native.ssid !== state.ssid) {
      state.ssid = native.ssid;
      const si = $('ssid-input');
      if (si) si.value = native.ssid;
    }
  } else {
    if (native && native.failed) {
      toast(native.reason === 'permission'
        ? 'Grant location permission for real Wi-Fi data — using estimates'
        : 'Wi-Fi data unavailable (' + native.reason + ') — using estimates');
    }
    radio = radioDetailsAt(currentTest.x, currentTest.y);
  }
  const extras = {
    jitter: target.jitter != null ? target.jitter : Math.max(1, Math.round(rand(1, 5) + target.ping * 0.15)),
    ...radio,
    netType: deviceLink(),
  };
  if (currentTest.source === 'live' && cfMeta) {
    if (cfMeta.asOrganization) extras.isp = cfMeta.asOrganization;
    if (cfMeta.colo) extras.server = `Cloudflare ${cfMeta.colo}`;
  }
  Object.assign(currentTest, target, extras, { done: true });
  $('st-details').innerHTML = scanDetailsHtml(currentTest);
  $('m-ping').textContent = target.ping;
  $('m-down').textContent = target.down;
  $('m-up').textContent = target.up == null ? '—' : target.up;
  $('gauge-value').textContent = target.down;
  $('gauge-unit').textContent = 'Mbps';
  $('gauge-arc').style.strokeDashoffset = GAUGE_LEN * (1 - clamp(target.down / 240, 0, 1));
  $('st-progress').style.width = '100%';
  $('st-status').textContent = 'Test complete ✓';
  setActiveTile(null);

  const c = speedColor(target.down);
  const q = $('st-quality');
  q.className = `rounded-xl border px-4 py-2.5 text-center text-sm font-bold ${c.cls}`;
  q.textContent = `${target.down} Mbps — ${c.desc}`;
  $('st-result').classList.remove('hidden');
  if (!$('st-room').value) $('st-room').focus();
  refreshIcons();
}

function closeSpeedtest(save) {
  cancelAnimationFrame(testRaf);
  if (liveAbort) liveAbort.abort();
  if (save && currentTest && currentTest.done) {
    const room = $('st-room').value.trim() || `Spot ${state.pins.length + 1}`;
    const data = (({ ping, down, up, jitter, rssi, sigPct, band, channel, width, security, bssid, linkSpeed, standard, freq, radioReal, isp, server, netType, source }) =>
      ({ ping, down, up, jitter, rssi, sigPct, band, channel, width, security, bssid, linkSpeed, standard, freq, radioReal, isp, server, netType, source }))(currentTest);
    if (currentTest.replaceId) {
      const pin = state.pins.find(p => p.id === currentTest.replaceId);
      if (pin) Object.assign(pin, { room, ...data });
    } else {
      state.pins.push({ id: 'pin-' + Date.now().toString(36), x: currentTest.x, y: currentTest.y, room, ...data });
    }
    renderPins();
    updateToolbar();
    if (!currentTest.replaceId && state.pins.length === 3) toast('🎉 3 pins mapped — your certificate is ready to generate!');
  }
  currentTest = null;
  closeModal('modal-speedtest');
}
