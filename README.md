# Tracking Links

A full-stack web application for generating trackable short links with IP-based geolocation, analytics, and advanced features.

## Features

- Email/password authentication (session-based)
- Create short tracking links with custom slugs
- Track every click: IP, server-side geolocation (ip-api.com), client-side geolocation (browser API), reverse-geocoded address (Nominatim), user-agent, timestamp
- **Password-protected links** — visitors must enter a password before being redirected
- **Link expiry** — set links to auto-expire at a specific date/time
- **UTM parameters** — auto-append utm_source, utm_medium, utm_campaign to destination URLs
- **QR codes** — inline QR code generation for every link
- **Analytics dashboard** — charts for clicks per day, browser breakdown, OS breakdown
- **Export** — download click data as JSON or CSV
- **Pagination** — for links list and click history
- Leaflet map showing IP-based click locations
- Redirect visitors to the destination URL after tracking

## Tech Stack

- **Frontend:** React 18 + Vite, React Router, Leaflet (react-leaflet), Chart.js, QRCode.react
- **Backend:** Node.js + Express, sql.js (SQLite), express-session, bcryptjs
- **Geolocation:** ip-api.com (free tier, no API key) + browser Geolocation API
- **Reverse geocoding:** Nominatim / OpenStreetMap (free)

## Setup

### Prerequisites

- Node.js 18+

### Install

```bash
cd tracking-links
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### Run (development)

```bash
npm run dev
```

Opens at `http://localhost:5173` (frontend proxies API to `http://localhost:3001`).

### Production build

```bash
cd client && npm run build && cd ..
NODE_ENV=production node server/index.js
```

Open `http://localhost:3001`.

## Deploy to Render (free, no credit card)

1. Push this repo to GitHub
2. Go to https://dashboard.render.com → **New** → **Web Service**
3. Connect your repo, use these settings:

| Setting | Value |
|---|---|
| Runtime | `Node` |
| Build Command | `cd client && npm install --include=dev && node node_modules/vite/bin/vite.js build` |
| Start Command | `node server/index.js` |
| Plan | **Free** |

4. Add env var: `SESSION_SECRET` = any random string
5. Deploy

## How it works

1. Register an account, then log in
2. Create a tracking link:
   - Enter destination URL and optional label
   - Optionally set a custom slug, password, expiry date, UTM params
3. Share the generated link (e.g. `https://yourapp.com/r/abc123` or `/r/my-custom-slug`)
4. When someone visits the link:
   - If password-protected, a password form is shown
   - Page attempts client-side geolocation (browser permission)
   - Server looks up the visitor's IP for lat/lng via ip-api.com
   - Reverse-geocodes coordinates via Nominatim for a human-readable address
   - Stores all click data (IP, both geo sources, address, user-agent, timestamp)
   - Redirects to the destination URL (with UTM params appended if set)
5. View analytics on the dashboard — charts, maps, exportable data

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/auth/me` | No | Get current user |
| POST | `/api/links` | Yes | Create link (supports slug, password, expiry, UTM) |
| GET | `/api/links` | Yes | List links (paginated) |
| GET | `/api/links/:id` | Yes | Link detail + clicks (paginated) |
| PUT | `/api/links/:id` | Yes | Update link |
| DELETE | `/api/links/:id` | Yes | Delete link |
| GET | `/api/links/:id/export/json` | Yes | Export clicks as JSON |
| GET | `/api/links/:id/export/csv` | Yes | Export clicks as CSV |
| GET | `/r/:code` | No | Track + redirect (handles password/expiry) |
| POST | `/api/track/:code/info` | No | Get link info (password needed? expired?) |
| POST | `/api/track/:code/verify` | No | Verify password, returns destination |
| POST | `/api/track/:code/click` | No | Record a click (with optional client geo) |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend port |
| `SESSION_SECRET` | `change-me-in-production` | Session signing secret |
| `DB_PATH` | `server/tracking.db` | SQLite database file path |

## License

MIT