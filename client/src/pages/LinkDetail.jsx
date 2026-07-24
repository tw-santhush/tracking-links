import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ClickMap from '../components/ClickMap';

const API = '/api';

export default function LinkDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/links/${id}`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setData)
      .catch(() => setError('Link not found'));
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading...</p>;

  const { link, clicks } = data;
  const baseUrl = window.location.origin;
  const geoPoints = clicks.filter(c => c.lat && c.lng).map(c => ({ lat: c.lat, lng: c.lng, address: c.address }));

  return (
    <div>
      <Link to="/" className="btn btn-sm mb-12">&larr; Back</Link>
      <div className="card">
        <div className="flex justify-between items-center">
          <div>
            <h2>{link.label || '(no label)'}</h2>
            <p className="text-sm text-muted">{baseUrl}/r/{link.code}</p>
            <p className="text-sm text-muted">Destination: {link.destination}</p>
          </div>
          <span className="click-count">{clicks.length} clicks</span>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-12">Click History</h3>
        {clicks.length === 0 ? (
          <p className="text-muted text-sm">No clicks yet.</p>
        ) : (
          <table className="click-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>IP</th>
                <th>Coordinates</th>
                <th>Address</th>
                <th>Device</th>
              </tr>
            </thead>
            <tbody>
              {clicks.map(click => (
                <tr key={click.id}>
                  <td>{new Date(click.timestamp + 'Z').toLocaleString()}</td>
                  <td>{click.ip || '-'}</td>
                  <td>{click.lat ? `${click.lat.toFixed(4)}, ${click.lng.toFixed(4)}` : '-'}</td>
                  <td className="address-cell" title={click.address || ''}>{click.address || '-'}</td>
                  <td className="address-cell" title={click.user_agent || ''}>{click.user_agent ? click.user_agent.substring(0, 40) + '...' : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {geoPoints.length > 0 && (
        <div className="card">
          <h3 className="mb-12">Click Locations</h3>
          <ClickMap points={geoPoints} />
        </div>
      )}
    </div>
  );
}