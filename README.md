# WiFiMap — Certified Airbnb Wi-Fi Signal Mapper

**Map your Wi-Fi. Certify your Speed. Attract Digital Nomads.**

WiFiMap is a single-page Progressive Web App that helps Airbnb hosts and
co-working space owners map, certify, and monetize their internet speed by
generating a visual Wi-Fi Quality Certificate for their listings.

> All speed tests and the checkout flow are **simulated** for demonstration
> purposes — no real network measurement or payment takes place.

## Features

- **Welcome dashboard** with two ways to start: upload your own floor plan
  image (with preview) or use a built-in 3-room apartment template (SVG
  blueprint), instantly usable with sample demo data.
- **Interactive mapping canvas** — tap/click anywhere on the floor plan to
  drop a pin and run an animated speed-test simulation (ping, download,
  upload over ~3.8 s). Pins and their signal halo are color-coded:
  - 🟢 **Green** — 100+ Mbps (excellent for 4K streaming / remote work)
  - 🟡 **Yellow** — 30–99 Mbps (good for general use)
  - 🔴 **Red** — under 30 Mbps (poor connection)
- **Pin management** — name each location (Living Room, Workspace, …),
  inspect, re-test, or delete pins from the map or the sidebar list.
- **Wi-Fi Quality Certificate** — unlocked after 3+ pins. Locks editing and
  renders a print-ready certificate with property name, certification date,
  automatic star rating, a "VERIFIED HIGH-SPEED WI-FI" badge, the coverage
  map, and a per-room speed table.
- **Simulated paywall** — a Stripe-style checkout modal ("Pay $5") that, on
  success, removes the preview watermark and triggers the browser print
  dialog so the certificate can be saved as a PDF.
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
