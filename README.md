# WiFiMap — Certified Airbnb Wi-Fi Signal Mapper

**Map your Wi-Fi. Certify your Speed. Attract Digital Nomads.**

WiFiMap is a single-page Progressive Web App that helps Airbnb hosts and
co-working space owners map, certify, and monetize their internet speed by
generating a visual Wi-Fi Quality Certificate for their listings.

> **Live mode** (default) measures your real connection through Cloudflare's
> public speed-test endpoints (`speed.cloudflare.com`). A **demo mode**
> toggle switches to simulated values (also used automatically as an offline
> fallback). The checkout flow is simulated — no real payment takes place.

## Features

- **Welcome dashboard** with three ways to start: upload your own floor plan
  image (with preview), use a built-in 3-room apartment template (SVG
  blueprint, instantly usable with sample demo data), or draw your own plan.
- **Map creator** — sketch your floor plan directly in the app: drag to draw
  grid-snapped rooms, name them, place the router (simulated speeds decay
  with distance from it), with undo/clear. Touch-friendly.
- **Interactive mapping canvas** — tap/click anywhere on the floor plan to
  drop a pin and run a speed test (ping, download, upload with a live
  animated gauge). **Live mode** measures your actual connection via
  Cloudflare (latency = median of timed requests; download = streamed
  payloads up to 50 MB over a ~5 s budget; upload = timed 5 MB POST).
  **Demo mode** simulates speeds that decay with distance from the router.
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

## Tech stack

- Semantic HTML5 + vanilla JavaScript (no build step)
- [Tailwind CSS](https://tailwindcss.com) (CDN)
- [Lucide Icons](https://lucide.dev) (CDN)
- Web App Manifest + Service Worker

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
