const express = require('express');
const https = require('https');
const http = require('http');
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

router.get('/:code', async (req, res) => {
  const link = db.get('SELECT * FROM links WHERE code = ?', [req.params.code]);
  if (!link) {
    return res.status(404).send('Link not found');
  }

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
    'INSERT INTO clicks (link_id, ip, lat, lng, address, user_agent) VALUES (?, ?, ?, ?, ?, ?)',
    [link.id, geo?.ip || ip || null, geo?.lat || null, geo?.lng || null, address, req.headers['user-agent'] || null]
  );

  res.redirect(301, link.destination);
});

module.exports = router;