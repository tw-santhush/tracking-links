const express = require('express');
const https = require('https');
const http = require('http');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

function geoLookup(ip) {
  return new Promise((resolve) => {
    const url = `http://ip-api.com/json/${ip}?fields=status,lat,lon,query`;
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'success') {
            resolve({ lat: json.lat, lng: json.lon, ip: json.query });
          } else {
            resolve(null);
          }
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function reverseGeocode(lat, lng) {
  return new Promise((resolve) => {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const options = {
      headers: { 'User-Agent': 'TrackingLinksApp/1.0' }
    };
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.display_name || null);
        } catch {
          resolve(null);
        }
      });
    }).on('error', () => resolve(null));
  });
}

function getPublicIp() {
  return new Promise((resolve) => {
    http.get('http://ip-api.com/json/?fields=query', (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).query); }
        catch { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

function appendUtm(url, link) {
  if (!link.utm_source && !link.utm_medium && !link.utm_campaign) return url;
  const params = [];
  if (link.utm_source) params.push(`utm_source=${encodeURIComponent(link.utm_source)}`);
  if (link.utm_medium) params.push(`utm_medium=${encodeURIComponent(link.utm_medium)}`);
  if (link.utm_campaign) params.push(`utm_campaign=${encodeURIComponent(link.utm_campaign)}`);
  const separator = url.includes('?') ? '&' : '?';
  return url + separator + params.join('&');
}

function trackingPageHtml(link, error) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redirecting...</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f0f2f5; color: #333; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; width: 100%; text-align: center; }
    h2 { margin-bottom: 16px; }
    p { margin-bottom: 12px; color: #555; font-size: 0.9rem; }
    input { width: 100%; padding: 10px 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 0.95rem; margin-bottom: 12px; }
    .btn { display: inline-block; padding: 10px 20px; border: none; border-radius: 6px; font-size: 0.95rem; cursor: pointer; background: #0f3460; color: #fff; width: 100%; }
    .btn:hover { opacity: 0.85; }
    .error { color: #e74c3c; font-size: 0.85rem; margin-top: 8px; }
    .spinner { border: 3px solid #f3f3f3; border-top: 3px solid #0f3460; border-radius: 50%; width: 24px; height: 24px; animation: spin 1s linear infinite; margin: 12px auto; }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="card" id="app">
    <h2>You're being redirected</h2>
    <p>Click the button to continue.</p>
    <button class="btn" id="continueBtn">Continue to site</button>
    <p class="text-sm text-muted" style="margin-top:12px;font-size:0.8rem;color:#999;" id="status"></p>
  </div>

  <script>
    const link = ${JSON.stringify({ code: link.code, hasPassword: !!link.password_hash, destination: link.destination, expiresAt: link.expires_at })};

    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      document.getElementById('app').innerHTML = '<h2>Link Expired</h2><p>This link is no longer available.</p>';
    }

    function showButton(msg) {
      document.getElementById('app').innerHTML = \`
        <h2>You're being redirected</h2>
        <p>$\{msg}</p>
        <button class="btn" id="continueBtn">Continue to site</button>
        <p class="text-sm text-muted" style="margin-top:12px;font-size:0.8rem;color:#999;" id="status"></p>
      \`;
      document.getElementById('continueBtn').addEventListener('click', requestGeo);
    }

    async function sendClick(clientLat, clientLng) {
      document.getElementById('status').textContent = 'Redirecting...';
      try {
        await fetch('/api/track/' + link.code + '/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientLat, clientLng })
        });
      } catch (e) {}
      window.location.replace(link.destination);
    }

    function requestGeo() {
      document.getElementById('status').textContent = 'Capturing location...';
      navigator.geolocation.getCurrentPosition(
        (pos) => sendClick(pos.coords.latitude, pos.coords.longitude),
        () => sendClick(null, null),
        { timeout: 5000, enableHighAccuracy: true }
      );
    }

    if (link.hasPassword) {
      document.getElementById('app').innerHTML = \`
        <h2>Password Required</h2>
        <p>This link is password-protected.</p>
        <input type="password" id="password" placeholder="Enter password" />
        <button class="btn" onclick="verifyPassword()">Submit</button>
        <div id="error" class="error"></div>
      \`;
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => sendClick(pos.coords.latitude, pos.coords.longitude),
        () => showButton('Click the button to continue.'),
        { timeout: 3000, enableHighAccuracy: false }
      );
    }

    async function verifyPassword() {
      const password = document.getElementById('password').value;
      document.getElementById('error').textContent = '';
      try {
        const res = await fetch('/api/track/' + link.code + '/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (!res.ok) {
          document.getElementById('error').textContent = data.error || 'Wrong password';
          return;
        }
        link.destination = data.destination;
        link.hasPassword = false;
        showButton('Password correct. Click to continue.');
      } catch (e) {
        document.getElementById('error').textContent = 'Network error';
      }
    }
  </script>
</body>
</html>`;
}

router.get('/:code', async (req, res) => {
  const link = db.get('SELECT * FROM links WHERE code = ?', [req.params.code]);
  if (!link) {
    return res.status(404).send('Link not found');
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return res.status(410).send('This link has expired');
  }

  return res.send(trackingPageHtml(link));
});

router.post('/:code/click', async (req, res) => {
  const link = db.get('SELECT * FROM links WHERE code = ?', [req.params.code]);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const { clientLat, clientLng } = req.body || {};

  let ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || '127.0.0.1';

  if (ip === '::1' || ip === '127.0.0.1') {
    ip = await getPublicIp() || ip;
  }

  const geo = ip ? await geoLookup(ip) : null;
  let address = null;
  if (geo) {
    address = await reverseGeocode(geo.lat, geo.lng);
  }

  db.run(
    'INSERT INTO clicks (link_id, ip, lat, lng, address, client_lat, client_lng, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [link.id, geo?.ip || ip || null, geo?.lat || null, geo?.lng || null, address, clientLat || null, clientLng || null, req.headers['user-agent'] || null]
  );

  res.json({ ok: true });
});

router.post('/:code/info', (req, res) => {
  const link = db.get('SELECT * FROM links WHERE code = ?', [req.params.code]);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const expired = link.expires_at && new Date(link.expires_at) < new Date();

  res.json({
    code: link.code,
    destination: link.destination,
    hasPassword: !!link.password_hash,
    expired
  });
});

router.post('/:code/verify', (req, res) => {
  const link = db.get('SELECT * FROM links WHERE code = ?', [req.params.code]);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const { password } = req.body || {};
  if (!password || !bcrypt.compareSync(password, link.password_hash)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  res.json({ destination: appendUtm(link.destination, link) });
});

module.exports = router;