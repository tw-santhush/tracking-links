# Tracking Links

A full-stack web application for generating trackable short links with IP-based geolocation.

## Features

- Email/password authentication (session-based)
- Create short tracking links with labels
- Track every click: IP, geolocation (lat/lng via ip-api.com), reverse-geocoded address (via Nominatim), user-agent, timestamp
- Dashboard with click counts per link
- Per-link detail view with click history table
- Leaflet map showing click locations
- Redirect visitors to the destination URL after tracking

## Tech Stack

- **Frontend:** React 18 + Vite, React Router, Leaflet (react-leaflet)
- **Backend:** Node.js + Express, better-sqlite3 (SQLite), express-session
- **Geolocation:** ip-api.com (free tier, no API key needed)
- **Reverse geocoding:** Nominatim / OpenStreetMap (free)

## Setup

### Prerequisites

- Node.js 18+

### Install

```bash
cd tracking-links

# Install all dependencies (root, server, client)
npm install
cd server && npm install && cd ..
cd client && npm install && cd ..
```

### Run (development)

```bash
# From the tracking-links directory — starts both server and client
npm run dev
```

This starts:
- Backend on `http://localhost:3001`
- Frontend on `http://localhost:5173` (with proxy to backend)

Open `http://localhost:5173` in your browser.

### Production build

```bash
cd client && npm run build && cd ..
NODE_ENV=production node server/index.js
```

Then open `http://localhost:3001`.

## Free Deployment

### Fly.io (recommended — free tier includes persistent storage)

```bash
# Install flyctl
curl -fsSL https://fly.io/install.sh | sh

# Login
fly auth login

# Launch the app (creates fly.toml, provisions resources)
fly launch --no-deploy

# Create a persistent volume for SQLite (3GB free)
fly volumes create data --region iad --size 3

# Set a secure session secret
fly secrets set SESSION_SECRET=$(openssl rand -hex 32)

# Deploy
fly deploy

# Open the app
fly open
```

Your app will be at `https://tracking-links.fly.dev`.

> The free tier includes 3 shared VMs, 3GB persistent storage, and 160GB outbound transfer/month. VMs never sleep on Fly.io.

Set environment variables (optional):

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Backend port |
| `SESSION_SECRET` | `change-me-in-production` | Session signing secret |

## How it works

1. Register an account, then log in
2. Create a tracking link by entering a destination URL and optional label
3. Share the generated link (e.g. `http://localhost:5173/r/abc123`)
4. When someone visits the link, the server:
   - Looks up the visitor's IP via ip-api.com for lat/lng
   - Reverse-geocodes the coordinates via Nominatim for a human-readable address
   - Stores the click data (IP, coords, address, user-agent, timestamp)
   - Redirects (301) to the destination URL
5. View click analytics on the dashboard

## API Routes

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register |
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/auth/me` | No | Get current user |
| POST | `/api/links` | Yes | Create link |
| GET | `/api/links` | Yes | List links |
| GET | `/api/links/:id` | Yes | Link detail + clicks |
| DELETE | `/api/links/:id` | Yes | Delete link |
| GET | `/r/:code` | No | Track + redirect |

## License

MIT