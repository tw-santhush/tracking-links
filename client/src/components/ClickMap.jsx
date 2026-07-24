import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function ClickMap({ points }) {
  if (points.length === 0) return null;

  const center = points.length === 1
    ? [points[0].lat, points[0].lng]
    : [
        points.reduce((s, p) => s + p.lat, 0) / points.length,
        points.reduce((s, p) => s + p.lng, 0) / points.length,
      ];

  return (
    <MapContainer
      center={center}
      zoom={3}
      className="map-container"
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {points.map((p, i) => (
        <Marker key={i} position={[p.lat, p.lng]}>
          <Popup>{p.address || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}