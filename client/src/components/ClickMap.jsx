import { useJsApiLoader, GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useState } from 'react';

const containerStyle = { width: '100%', height: '400px', borderRadius: '6px' };

export default function ClickMap({ serverPoints, clientPoints }) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const [selected, setSelected] = useState(null);

  const allPoints = [...(serverPoints || []), ...(clientPoints || [])];
  if (allPoints.length === 0) return null;

  const center = allPoints.length === 1
    ? { lat: allPoints[0].lat, lng: allPoints[0].lng }
    : {
        lat: allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length,
        lng: allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length,
      };

  const hasClientGeo = clientPoints && clientPoints.length > 0;

  const serverIcon = {
    path: window.google?.maps?.SymbolPath?.CIRCLE || 1,
    fillColor: '#0f3460',
    fillOpacity: 1,
    strokeWeight: 1,
    strokeColor: '#fff',
    scale: 8,
  };

  const clientIcon = {
    path: window.google?.maps?.SymbolPath?.CIRCLE || 1,
    fillColor: '#e74c3c',
    fillOpacity: 1,
    strokeWeight: 1,
    strokeColor: '#fff',
    scale: 8,
  };

  if (!isLoaded) return <div className="map-placeholder">Loading map...</div>;

  return (
    <div>
      {hasClientGeo && (
        <p className="text-sm text-muted mb-12">
          <span style={{ color: '#e74c3c' }}>●</span> Client (browser) location &nbsp;
          <span style={{ color: '#0f3460' }}>●</span> Server (IP) location
        </p>
      )}
      <GoogleMap mapContainerStyle={containerStyle} center={center} zoom={hasClientGeo ? 10 : 3}>
        {(serverPoints || []).map((p, i) => (
          <Marker
            key={`s-${i}`}
            position={{ lat: p.lat, lng: p.lng }}
            icon={serverIcon}
            onClick={() => setSelected({ type: 'server', ...p })}
          />
        ))}
        {(clientPoints || []).map((p, i) => (
          <Marker
            key={`c-${i}`}
            position={{ lat: p.lat, lng: p.lng }}
            icon={clientIcon}
            onClick={() => setSelected({ type: 'client', ...p })}
          />
        ))}
        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div>
              <strong>{selected.type === 'server' ? 'IP-based location' : 'Browser location'}</strong>
              <br />
              {selected.address || `${selected.lat.toFixed(4)}, ${selected.lng.toFixed(4)}`}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}