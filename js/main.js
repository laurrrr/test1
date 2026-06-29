/* WiFiMap — Event wiring, PWA install, service worker, init. */

/* ---------- wiring ---------- */
$('map-wrap').addEventListener('click', onMapTap);

const builderCanvas = $('builder-canvas');
builderCanvas.addEventListener('pointerdown', onBuilderDown);
builderCanvas.addEventListener('pointermove', onBuilderMove);
builderCanvas.addEventListener('pointerup', onBuilderUp);
builderCanvas.addEventListener('pointercancel', () => { builder.drag = null; renderBuilder(); });

$('file-input').addEventListener('change', (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    pendingUploadSrc = reader.result;
    $('upload-preview-img').src = pendingUploadSrc;
    $('upload-preview').classList.remove('hidden');
    $('upload-preview').scrollIntoView({ behavior: 'smooth', block: 'center' });
    refreshIcons();
  };
  reader.readAsDataURL(file);
});

$('ssid-input').addEventListener('input', (e) => {
  state.ssid = e.target.value.trim() || 'Home Wi-Fi';
  persist();
});

$('property-name').addEventListener('input', (e) => {
  state.propertyName = e.target.value;
  $('cert-property').textContent = state.propertyName || 'My Wi-Fi';
  persist();
});

// Stripe-like input formatting
$('cc-number').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
});
$('cc-exp').addEventListener('input', (e) => {
  let v = e.target.value.replace(/\D/g, '').slice(0, 4);
  e.target.value = v.length > 2 ? v.slice(0, 2) + ' / ' + v.slice(2) : v;
});
$('cc-cvc').addEventListener('input', (e) => {
  e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
});

// Close modals on backdrop click / Escape
for (const id of ['modal-speedtest', 'modal-pin', 'modal-checkout', 'modal-roomname']) {
  $(id).addEventListener('click', (e) => {
    if (e.target.id !== id) return;
    if (id === 'modal-speedtest') closeSpeedtest(false);
    else if (id === 'modal-pin') closePinModal();
    else if (id === 'modal-roomname') cancelRoomName();
    else closeCheckout();
  });
}
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  closeSpeedtest(false); closePinModal(); closeCheckout();
  if (!$('modal-roomname').classList.contains('hidden')) cancelRoomName();
});

// PWA install prompt
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  $('btn-install').classList.remove('hidden');
  $('btn-install').classList.add('flex');
  refreshIcons();
});
$('btn-install').addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  $('btn-install').classList.add('hidden');
});

// Service worker (browser/PWA only — the Android shell serves bundled assets itself)
if (!IS_NATIVE && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

// Init
checkResumeBanner();
if (IS_NATIVE) toast('Native Android mode — collecting real Wi-Fi radio data');
updateAdminChip();
if (location.hash === '#admin') showAdmin();
window.addEventListener('hashchange', () => { if (location.hash === '#admin') showAdmin(); });
window.addEventListener('DOMContentLoaded', refreshIcons);
window.addEventListener('load', refreshIcons);
