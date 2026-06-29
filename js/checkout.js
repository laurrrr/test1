/* WiFiMap — Simulated paywall checkout flow. */

/* ---------- checkout ---------- */
function onDownloadClick() {
  if (state.paid || state.adminMode) { doPrint(); return; }
  $('checkout-form').classList.remove('hidden');
  $('checkout-processing').classList.add('hidden');
  $('checkout-success').classList.add('hidden');
  openModal('modal-checkout');
}

function closeCheckout() { closeModal('modal-checkout'); }

function processPayment() {
  $('checkout-form').classList.add('hidden');
  $('checkout-processing').classList.remove('hidden');
  refreshIcons();
  setTimeout(() => {
    $('checkout-processing').classList.add('hidden');
    $('checkout-success').classList.remove('hidden');
    refreshIcons();
    setTimeout(() => {
      state.paid = true;
      closeCheckout();
      renderCertificate();
      persist();
      toast('✓ Official certificate unlocked');
      setTimeout(() => doPrint(), 700);
    }, 1400);
  }, 1800);
}
