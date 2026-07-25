# Tracking Links

A full-stack application for creating trackable short links with click analytics, device fingerprinting, camera capture, and geolocation tracking.

## Features

- **Short Link Generation** — create trackable short links with optional custom slugs
- **Click Tracking** — captures IP address, user-agent, timestamp, UTM parameters
- **Geolocation** — dual-source: IP-based (ip-api.com) + browser GPS with accuracy display
- **Device Fingerprinting** — 100+ signals: screen, WebGL, canvas, audio, media queries, sensors, connection, battery, permissions
- **Camera Capture** — captures a photo via browser camera before redirect
- **Password Protection** — links can require a password before redirecting
- **Link Expiry** — set links to auto-expire at a specific date/time
- **UTM Parameters** — auto-append utm_source/medium/campaign to destination URLs
- **QR Codes** — inline QR code for every link
- **Analytics Dashboard** — filterable click history, expandable fingerprint data, camera snapshots, map view
- **Interactive Map** — Leaflet map with IP-based (blue) and browser (red) markers, accuracy radius circles
- **Dark Mode** — toggleable theme with localStorage persistence
- **Link Groups** — organize links into categories with group filtering
- **Export** — download click data as JSON or CSV
- **PostgreSQL Support** — SQLite for development, PostgreSQL for production (via `DATABASE_URL`)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router, Leaflet, QRCode.react |
| Backend | Node.js, Express, express-session, bcryptjs |
| Database | SQLite (sql.js) / PostgreSQL (pg) |
| Geolocation | ip-api.com (IP), browser Geolocation API (GPS) |
| Reverse Geocoding | Nominatim / OpenStreetMap |
| Deployment | Render (free tier) |

## Getting Started

### Prerequisites

- Node.js 18+

### Install & Run

```bash
# Install dependencies
npm install
cd client && npm install --include=dev && cd ..

# Run in development
npm run dev
```

The frontend runs at `http://localhost:5173` (proxies API to `http://localhost:3001`).

### Production Build

```bash
cd client && npx vite build && cd ..
NODE_ENV=production node server/index.js
```

Open `http://localhost:3001`.

## How It Works

1. Register an account and log in
2. Create a tracking link with a destination URL, optional label, slug, password, expiry date, and UTM parameters
3. Share the generated link (e.g. `https://yourapp.com/r/abc123`)
4. When a visitor opens the link:
   - If password-protected, a password form is shown
   - **Continue** button triggers camera capture + GPS geolocation in parallel
   - Device fingerprint is collected (100+ browser signals)
   - All data is logged server-side
   - Visitor is redirected to the destination URL
5. View clicks on the dashboard: interactive map, fingerprint details, camera snapshots, filtered history

## API

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/logout` | — | Logout |
| GET | `/api/auth/me` | — | Current user |
| POST | `/api/links` | Yes | Create link |
| GET | `/api/links` | Yes | List links (paginated) |
| GET | `/api/links/:id` | Yes | Link detail + clicks |
| PUT | `/api/links/:id` | Yes | Update link |
| DELETE | `/api/links/:id` | Yes | Delete link |
| GET | `/api/links/:id/export/json` | Yes | Export clicks as JSON |
| GET | `/api/links/:id/export/csv` | Yes | Export clicks as CSV |
| POST | `/api/groups` | Yes | Create group |
| GET | `/api/groups` | Yes | List groups |
| PUT | `/api/groups/:id` | Yes | Rename group |
| DELETE | `/api/groups/:id` | Yes | Delete group |
| GET | `/r/:code` | — | Tracking page + redirect |
| POST | `/api/track/:code/info` | — | Get link info |
| POST | `/api/track/:code/verify` | — | Verify password |
| POST | `/api/track/:code/click` | — | Record click |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `SESSION_SECRET` | `change-me` | Session signing secret |
| `DATABASE_URL` | — | PostgreSQL connection string (enables PostgreSQL mode) |
| `DB_PATH` | `server/tracking.db` | SQLite file path |

## Deployment (Render)

1. Push to GitHub
2. Create a **Web Service** on Render
3. Set the **Build Command**:

```
npm install && cd client && npm install --include=dev && node node_modules/vite/bin/vite.js build
```

4. Set the **Start Command**: `node server/index.js`
5. Add `SESSION_SECRET` as an environment variable
6. (Optional) Add a free Render PostgreSQL and set `DATABASE_URL` to its Internal Connection String

## License

MIT
