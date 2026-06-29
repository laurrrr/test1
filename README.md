# WiFiMap — Wi-Fi Signal Mapper & Speed Certifier

**Map your Wi-Fi. Certify your Speed. Kill the dead zones.**

WiFiMap is a single-page Progressive Web App for **anyone** who wants to map
their Wi-Fi coverage, find the dead zones, and prove their speed — renters
checking a new place, remote workers and gamers hunting lag, students,
café and office owners, and short-term-rental hosts alike. Walk the space,
test each room, and generate a shareable Wi-Fi Quality Certificate.

> **Live mode** (default) measures your real connection through Cloudflare's
> public speed-test endpoints (`speed.cloudflare.com`). A **demo mode**
> toggle switches to simulated values (also used automatically as an offline
> fallback). The checkout flow is simulated — no real payment takes place.

## Features

- **Welcome dashboard** with three ways to start: upload your own floor plan
  image (with preview), use a built-in 3-room apartment template (SVG
  blueprint, instantly usable with sample demo data), or draw your own plan.
- **Map creator** — sketch your floor plan directly in the app: drag to draw
  grid-snapped rooms, name them, and add **one or more routers / access
  points** (place several to model a mesh — simulated speed decays with
  distance from the *nearest* AP), with undo/clear. Touch-friendly.
- **Interactive mapping canvas** — tap/click anywhere on the floor plan to
  drop a pin and run a speed test (ping, download, upload with a live
  animated gauge). **Live mode** measures your actual connection via
  Cloudflare (latency = median of timed requests; download = streamed
  payloads up to 50 MB over a ~5 s budget; upload = timed 5 MB POST). If the
  upload step is blocked it’s skipped and the download/ping are still saved;
  if the whole test can’t reach Cloudflare it falls back to demo with the
  reason shown. **Demo mode** simulates speeds that decay with distance from
  the nearest router.
  Pins and their signal halo are color-coded:
  - 🟢 **Green** — 100+ Mbps (excellent for 4K streaming / remote work)
  - 🟡 **Yellow** — 30–99 Mbps (good for general use)
  - 🔴 **Red** — under 30 Mbps (poor connection)
- **Per-scan details** — every test records jitter (from real latency
  samples in live mode), modeled Wi-Fi radio data (signal strength in dBm,
  band, channel, channel width, security — browsers can't read real radio
  info, so these are marked *est.* on live scans), the browser's Network
  Information link data, and in live mode your ISP and the Cloudflare edge
  that served the test. Details appear in the scan result, in pin details,
  and signal/band/channel per room on the certificate.
- **Pin management** — name each location (Living Room, Workspace, …),
  inspect, re-test, or delete pins from the map or the sidebar list.
- **Wi-Fi Quality Certificate** — unlocked after 3+ pins. Locks editing and
  renders a print-ready certificate with property name, certification date,
  automatic star rating, a "VERIFIED HIGH-SPEED WI-FI" badge, the coverage
  map, and a per-room speed table.
- **Simulated paywall** — a Stripe-style checkout modal ("Pay $5") that, on
  success, removes the preview watermark and triggers the browser print
  dialog so the certificate can be saved as a PDF.
- **Admin panel** — open it from the shield icon in the header or via the
  `#admin` URL hash (demo passcode: `admin`). Shows session stats and a
  **paywall bypass** toggle: while enabled, certificates render without the
  watermark and download for free, no checkout. Includes a data-reset tool.
- **PWA** — installable, offline-capable via a service worker, fully
  responsive and touch-friendly for walking around the property with a phone.
- **Persistence** — sessions are auto-saved to `localStorage` and can be
  resumed from the dashboard.

## Android app (APK)

The `android/` directory contains a complete native Android project that
wraps the web app in a WebView and injects a **native Wi-Fi bridge**
(`window.WifiNative`, backed by Android's `WifiManager`). Inside the APK
there is **no estimation** — scans record the device's real radio data:

- SSID and BSSID of the connected access point
- RSSI (dBm) and system-calculated signal percentage
- Frequency (MHz), channel, band (2.4 / 5 / 6 GHz) and channel width
- Negotiated link speed (plus TX/RX link speeds on Android 10+)
- Wi-Fi standard (Wi-Fi 4/5/6/7, Android 11+) and security (WPA2/WPA3…)

Real entries are badged with a green ✓ in the scan details. The bridge also
routes certificate downloads to Android's print-to-PDF dialog.

### Building the APK

1. Open the `android/` folder in **Android Studio** (Hedgehog or newer).
   It will set up the Gradle wrapper and sync automatically.
2. Press **Run** to install on a connected device, or build an APK with
   **Build → Build App Bundle(s)/APK(s) → Build APK(s)**
   (CLI: `gradle assembleDebug` — output in `app/build/outputs/apk/`).

The build copies `index.html` & friends from the repo root into the app's
assets, so the web app remains the single source of truth.

> **Permissions:** Android only reveals SSID/RSSI/scan data to apps holding
> location permission (`ACCESS_FINE_LOCATION`, plus `NEARBY_WIFI_DEVICES`
> on Android 13+) with device location services enabled. The app asks at
> launch; if denied, scans fall back to estimates and say so.

## Tech stack

- Semantic HTML5 + vanilla JavaScript (no build step)
- [Tailwind CSS](https://tailwindcss.com) (CDN)
- [Lucide Icons](https://lucide.dev) (CDN)
- Web App Manifest + Service Worker

## Project structure

The web app has no build step. `index.html` holds only the markup; styles
and behavior live in separate files, loaded as plain classic scripts in
dependency order:

```
index.html              markup + <script>/<link> references
css/app.css             custom styles (watermark, print, scrollbars)
js/tailwind-config.js   Tailwind Play CDN theme config
js/state.js             constants, shared state, generic utilities
js/storage.js           localStorage persistence + session resume
js/views.js             view switching, home nav, modal open/close
js/wifi.js              signal model, native bridge, scan-detail rendering
js/plans.js             floor-plan template, demo data, upload/template start
js/builder.js           map creator (draw rooms, place router)
js/mapping.js           coverage map: plan, pins, room list, toolbar
js/speedtest.js         live Cloudflare measurement + simulated animation
js/pins.js              pin detail modal (inspect / re-test / delete)
js/certificate.js       certificate generation, star rating, render
js/checkout.js          simulated paywall checkout
js/admin.js             admin panel (passcode gate, paywall bypass)
js/main.js              event wiring, PWA install, service worker, init
```

> The functions are shared via the global scope (classic scripts), so load
> order matters — `js/main.js` runs last. The native Android/iOS shells bundle
> the same files, so keep the web app as the single source of truth.

## Running locally

Serve the folder over HTTP (required for the service worker):

```bash
# Python
python3 -m http.server 8000

# or Node
npx serve .
```

Then open <http://localhost:8000>.

## Quick demo

Click **"Try Instant Demo"** on the landing page — it loads the apartment
template pre-seeded with four tested locations so you can explore the map,
generate the certificate, and walk through the checkout immediately.
