/* WiFiMap — Pin detail modal: inspect, re-test, delete. */

/* ---------- pin details ---------- */
function openPinModal(id) {
  const pin = state.pins.find(p => p.id === id);
  if (!pin) return;
  currentPinId = id;
  const c = speedColor(pin.down);
  $('pd-room').textContent = pin.room;
  $('pd-ping').textContent = pin.ping;
  $('pd-down').textContent = pin.down;
  $('pd-up').textContent = pin.up == null ? '—' : pin.up;
  const q = $('pd-quality');
  q.className = `mt-3 rounded-xl border px-4 py-2 text-center text-sm font-bold ${c.cls}`;
  q.textContent = c.desc;
  // Full Wi-Fi details (jitter, signal, band, channel, width, …) unlock only
  // once a certificate has been generated; before that, just ping/down/up.
  $('pd-details').innerHTML = state.certDate
    ? scanDetailsHtml(pin)
    : `<p class="rounded-xl border border-dashed border-slate-700 px-3 py-2 text-center text-[11px] text-slate-500">
         <i data-lucide="lock" class="inline h-3 w-3 -mt-0.5"></i>
         Jitter, signal, band &amp; channel unlock when you generate the certificate.
       </p>`;
  $('pd-actions').classList.toggle('hidden', state.locked);
  openModal('modal-pin');
}

function closePinModal() { currentPinId = null; closeModal('modal-pin'); }

function deleteCurrentPin() {
  state.pins = state.pins.filter(p => p.id !== currentPinId);
  closePinModal();
  renderPins();
  updateToolbar();
  toast('Pin deleted');
}

function retestCurrentPin() {
  const pin = state.pins.find(p => p.id === currentPinId);
  closePinModal();
  if (pin) openSpeedtest(pin.x, pin.y, pin.id);
}
