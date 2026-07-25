import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const blueIcon = new L.Icon({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const redIcon = new L.Icon({
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export default function ClickMap({ serverPoints, clientPoints }) {
  const allPoints = [...(serverPoints || []), ...(clientPoints || [])];
  if (allPoints.length === 0) return null;

  const center = allPoints.length === 1
    ? [allPoints[0].lat, allPoints[0].lng]
    : [
        allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length,
        allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length,
      ];

  const hasClientGeo = clientPoints && clientPoints.length > 0;

  return (
    <div>
      {hasClientGeo && (
        <p className="text-sm text-muted mb-12">
          <span style={{ color: '#e74c3c' }}>●</span> Client (browser) location &nbsp;
          <span style={{ color: '#0f3460' }}>●</span> Server (IP) location
        </p>
      )}
      <MapContainer
        center={center}
        zoom={hasClientGeo ? 10 : 3}
        className="map-container"
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        {(serverPoints || []).map((p, i) => (
          <Marker key={`s-${i}`} position={[p.lat, p.lng]} icon={blueIcon}>
            <Popup>
              <strong>IP-based location</strong><br/>
              {p.address || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}
            </Popup>
          </Marker>
        ))}
        {(clientPoints || []).map((p, i) => (
          <div key={`c-${i}`}>
            <Marker position={[p.lat, p.lng]} icon={redIcon}>
              <Popup>
                <strong>Browser location</strong><br/>
                {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                {p.accuracy ? <><br/>Accuracy: &plusmn;{p.accuracy < 50 ? '<50' : Math.round(p.accuracy)}m</> : ''}
              </Popup>
            </Marker>
            {p.accuracy && (
              <Circle
                center={[p.lat, p.lng]}
                radius={p.accuracy}
                pathOptions={{ color: '#e74c3c', fillOpacity: 0.08, weight: 1 }}
              />
            )}
          </div>
        ))}
      </MapContainer>
    </div>
  );
}
