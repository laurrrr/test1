/* WiFiMap — Floor-plan template, demo data, upload/template start flows. */

/* ---------- floor plans ---------- */
const TEMPLATE_SVG = `
<svg viewBox="0 0 800 560" class="block h-auto w-full" role="img" aria-label="3-room apartment floor plan">
  <defs>
    <pattern id="fp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
      <path d="M20 0H0V20" fill="none" stroke="#13283f" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="800" height="560" fill="#081526"/>
  <rect width="800" height="560" fill="url(#fp-grid)"/>

  <!-- outer walls -->
  <rect x="20" y="20" width="760" height="520" fill="none" stroke="#67b7e8" stroke-width="6"/>

  <!-- inner walls (gaps = doors) -->
  <g stroke="#67b7e8" stroke-width="4">
    <line x1="460" y1="20"  x2="460" y2="100"/>
    <line x1="460" y1="150" x2="460" y2="350"/>
    <line x1="460" y1="400" x2="460" y2="540"/>
    <line x1="20"  y1="320" x2="200" y2="320"/>
    <line x1="250" y1="320" x2="330" y2="320"/>
    <line x1="380" y1="320" x2="460" y2="320"/>
    <line x1="460" y1="220" x2="590" y2="220"/>
    <line x1="640" y1="220" x2="780" y2="220"/>
    <line x1="280" y1="320" x2="280" y2="400"/>
    <line x1="280" y1="450" x2="280" y2="540"/>
  </g>

  <!-- furniture hints -->
  <g fill="none" stroke="#2e587e" stroke-width="2.5">
    <rect x="60"  y="70"  width="150" height="60" rx="8"/>   <!-- sofa -->
    <rect x="60"  y="150" width="60"  height="60" rx="8"/>   <!-- chair -->
    <line x1="330" y1="40" x2="430" y2="40" stroke-width="6"/> <!-- TV -->
    <rect x="475" y="35"  width="290" height="38" rx="4"/>   <!-- kitchen counter -->
    <circle cx="620" cy="140" r="34"/>                        <!-- dining table -->
    <rect x="560" y="300" width="170" height="120" rx="8"/>  <!-- bed -->
    <rect x="40"  y="350" width="130" height="50" rx="6"/>   <!-- desk -->
    <rect x="310" y="350" width="60"  height="110" rx="20"/> <!-- bathtub -->
  </g>

  <!-- labels -->
  <g fill="#7da8c9" font-size="17" font-weight="700" font-family="ui-sans-serif,system-ui" letter-spacing="2">
    <text x="150" y="260">LIVING ROOM</text>
    <text x="575" y="110">KITCHEN</text>
    <text x="585" y="470">BEDROOM</text>
    <text x="75"  y="480">WORKSPACE</text>
    <text x="325" y="500">BATH</text>
  </g>

  <!-- router -->
  <g transform="translate(390 250)">
    <circle r="11" fill="#22d3ee"/>
    <circle r="11" fill="none" stroke="#22d3ee" stroke-width="2" opacity=".45">
      <animate attributeName="r" values="11;24" dur="1.8s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values=".45;0" dur="1.8s" repeatCount="indefinite"/>
    </circle>
    <path d="M-5 1 a7 7 0 0 1 10 0 M-2 4 a3 3 0 0 1 4 0" stroke="#06303d" stroke-width="2" fill="none" stroke-linecap="round"/>
    <text y="32" text-anchor="middle" fill="#22d3ee" font-size="12" font-weight="700" font-family="ui-sans-serif,system-ui">ROUTER</text>
  </g>
</svg>`;

const DEMO_PINS = [
  { id: 'demo-1', x: 30,    y: 30.4, room: 'Living Room', ping: 9,  down: 176, up: 84, jitter: 2,  rssi: -45, band: '5 GHz',   channel: 36, width: '80 MHz', security: 'WPA2/WPA3', source: 'sim' },
  { id: 'demo-2', x: 18.75, y: 76.8, room: 'Workspace',   ping: 14, down: 121, up: 56, jitter: 4,  rssi: -58, band: '5 GHz',   channel: 36, width: '40 MHz', security: 'WPA2/WPA3', source: 'sim' },
  { id: 'demo-3', x: 77.5,  y: 19.6, room: 'Kitchen',     ping: 21, down: 64,  up: 28, jitter: 7,  rssi: -68, band: '2.4 GHz', channel: 6,  width: '20 MHz', security: 'WPA2/WPA3', source: 'sim' },
  { id: 'demo-4', x: 82.5,  y: 75,   room: 'Bedroom',     ping: 38, down: 27,  up: 11, jitter: 12, rssi: -79, band: '2.4 GHz', channel: 6,  width: '20 MHz', security: 'WPA2/WPA3', source: 'sim' },
];

function startTemplate(withDemoData) {
  state.plan = { type: 'template' };
  state.pins = withDemoData ? DEMO_PINS.map(p => ({ ...p })) : [];
  state.locked = false;
  state.paid = false;
  state.certDate = null;
  showMapping();
  toast(withDemoData ? 'Demo loaded — tap pins to inspect, tap the map to add more' : 'Template ready — tap a room to run your first test');
}

function startUploaded() {
  if (!pendingUploadSrc) return;
  state.plan = { type: 'image', src: pendingUploadSrc };
  state.pins = [];
  state.locked = false;
  state.paid = false;
  state.certDate = null;
  showMapping();
  toast('Floor plan loaded — tap anywhere to test');
}

function cancelUpload() {
  pendingUploadSrc = null;
  $('upload-preview').classList.add('hidden');
  $('file-input').value = '';
}
