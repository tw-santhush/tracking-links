import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { Map, Popup, Marker, NavigationControl } from 'maplibre-gl';

export default function ClickMap({ serverPoints, clientPoints }) {
  const container = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  const allPoints = [...(serverPoints || []), ...(clientPoints || [])];

  useEffect(() => {
    if (!container.current || map.current) return;

    const center = allPoints.length === 1
      ? [allPoints[0].lng, allPoints[0].lat]
      : [
          allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length,
          allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length,
        ];

    map.current = new Map({
      container: container.current,
      style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
      center,
      zoom: clientPoints?.length ? 10 : 3,
    });

    map.current.addControl(new NavigationControl(), 'top-right');

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    markers.current.forEach(m => m.remove());
    markers.current = [];

    (serverPoints || []).forEach(p => {
      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.background = '#0f3460';
      el.style.border = '2px solid #fff';
      el.style.cursor = 'pointer';

      const popup = new Popup({ offset: 10 }).setHTML(
        `<strong>Server location</strong><br/>${p.address || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}`
      );

      const m = new Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(popup)
        .addTo(map.current);
      markers.current.push(m);
    });

    (clientPoints || []).forEach(p => {
      const el = document.createElement('div');
      el.style.width = '14px';
      el.style.height = '14px';
      el.style.borderRadius = '50%';
      el.style.background = '#e74c3c';
      el.style.border = '2px solid #fff';
      el.style.cursor = 'pointer';

      const popup = new Popup({ offset: 10 }).setHTML(
        `<strong>Browser location</strong><br/>${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`
      );

      const m = new Marker({ element: el })
        .setLngLat([p.lng, p.lat])
        .setPopup(popup)
        .addTo(map.current);
      markers.current.push(m);
    });
  }, [serverPoints, clientPoints]);

  if (allPoints.length === 0) return null;

  const hasClientGeo = clientPoints && clientPoints.length > 0;

  return (
    <div>
      {hasClientGeo && (
        <p className="text-sm text-muted mb-12">
          <span style={{ color: '#e74c3c' }}>●</span> Client (browser) location &nbsp;
          <span style={{ color: '#0f3460' }}>●</span> Server (IP) location
        </p>
      )}
      <div ref={container} style={{ width: '100%', height: '400px', borderRadius: '8px' }} />
    </div>
  );
}