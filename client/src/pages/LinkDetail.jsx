import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import ClickMap from '../components/ClickMap';

const API = '/api';

function parseFingerprint(fp) {
  if (!fp) return null;
  try { return typeof fp === 'string' ? JSON.parse(fp) : fp; } catch { return null; }
}

function formatFpValue(v) {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function FingerprintView({ data }) {
  const fp = parseFingerprint(data);
  if (!fp) return <p className="text-muted text-sm">No fingerprint data</p>;
  const rows = [];
  for (const [key, val] of Object.entries(fp)) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'object' && Object.keys(val).length === 0) continue;
    rows.push(
      <tr key={key}>
        <td className="fp-key">{key}</td>
        <td className="fp-val">{formatFpValue(val)}</td>
      </tr>
    );
  }
  return (
    <table className="fp-table">
      <tbody>{rows}</tbody>
    </table>
  );
}

export default function LinkDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [allClicks, setAllClicks] = useState([]);
  const [expandedFp, setExpandedFp] = useState(null);
  const [filters, setFilters] = useState({ date_from: '', date_to: '', browser: '', os: '', device: '' });

  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    setPage(1);
    setAllClicks([]);
  }, [filterKey]);

  useEffect(() => {
    const params = new URLSearchParams({ page, limit: '20' });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });

    fetch(`${API}/links/${id}?${params}`, { credentials: 'include' })
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(d => {
        setData(d);
        if (page === 1) {
          setAllClicks(d.clicks);
        } else {
          setAllClicks(prev => [...prev, ...d.clicks]);
        }
      })
      .catch(() => setError('Link not found'));
  }, [id, page, filterKey]);

  const updateFilter = (key, val) => {
    setFilters(prev => ({ ...prev, [key]: val }));
  };

  const clearFilters = () => {
    setFilters({ date_from: '', date_to: '', browser: '', os: '', device: '' });
  };

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading...</p>;

  const { link, clicks, total, hasMore } = data;
  const baseUrl = window.location.origin;
  const serverPoints = allClicks.filter(c => c.lat && c.lng).map(c => ({ lat: c.lat, lng: c.lng, address: c.address }));
  const clientPoints = allClicks.filter(c => c.client_lat && c.client_lng).map(c => ({ lat: c.client_lat, lng: c.client_lng }));

  const exportUrl = (fmt) => `${API}/links/${id}/export/${fmt}`;

  const hasActiveFilters = Object.values(filters).some(v => v);

  return (
    <div>
      <Link to="/" className="btn btn-sm mb-12">&larr; Back</Link>
      <div className="card">
        <div className="flex justify-between items-center">
          <div>
            <h2>{link.label || '(no label)'}</h2>
            <p className="text-sm text-muted">{baseUrl}/r/{link.code}</p>
            <p className="text-sm text-muted">Destination: {link.destination}</p>
            {link.utm_source && <p className="text-sm text-muted">UTM: {link.utm_source} / {link.utm_medium} / {link.utm_campaign}</p>}
            {link.expires_at && <p className="text-sm text-muted">Expires: {new Date(link.expires_at + 'Z').toLocaleString()}</p>}
            {link.password_hash && <p className="text-sm text-muted">Password protected</p>}
          </div>
          <div className="flex items-center gap-8">
            <span className="click-count">{total} clicks</span>
            <a href={exportUrl('json')} className="btn btn-sm btn-secondary" download>JSON</a>
            <a href={exportUrl('csv')} className="btn btn-sm btn-secondary" download>CSV</a>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex gap-8 items-center" style={{ flexWrap: 'wrap' }}>
          <label className="filter-label">
            From
            <input type="date" className="filter-input" value={filters.date_from} onChange={e => updateFilter('date_from', e.target.value)} />
          </label>
          <label className="filter-label">
            To
            <input type="date" className="filter-input" value={filters.date_to} onChange={e => updateFilter('date_to', e.target.value)} />
          </label>
          <label className="filter-label">
            Browser
            <select className="filter-input" value={filters.browser} onChange={e => updateFilter('browser', e.target.value)}>
              <option value="">All</option>
              <option value="Chrome">Chrome</option>
              <option value="Firefox">Firefox</option>
              <option value="Safari">Safari</option>
              <option value="Edge">Edge</option>
              <option value="IE">Internet Explorer</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label className="filter-label">
            OS
            <select className="filter-input" value={filters.os} onChange={e => updateFilter('os', e.target.value)}>
              <option value="">All</option>
              <option value="Windows">Windows</option>
              <option value="macOS">macOS</option>
              <option value="Linux">Linux</option>
              <option value="Android">Android</option>
              <option value="iOS">iOS</option>
            </select>
          </label>
          <label className="filter-label">
            Device
            <select className="filter-input" value={filters.device} onChange={e => updateFilter('device', e.target.value)}>
              <option value="">All</option>
              <option value="Desktop">Desktop</option>
              <option value="Mobile">Mobile</option>
              <option value="Tablet">Tablet</option>
            </select>
          </label>
          {hasActiveFilters && (
            <button className="btn btn-sm btn-secondary" onClick={clearFilters}>Clear</button>
          )}
        </div>
      </div>

      <div className="card">
        <h3 className="mb-12">Click History ({total})</h3>
        {clicks.length === 0 ? (
          <p className="text-muted text-sm">No clicks yet.</p>
        ) : (
          <>
            <div className="table-scroll">
              <table className="click-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>IP</th>
                    <th>Server Geo</th>
                    <th>Client Geo</th>
                    <th>Address</th>
                    <th>Device</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {clicks.map(click => (
                    <tr key={click.id}>
                      <td>{new Date(click.timestamp + 'Z').toLocaleString()}</td>
                      <td>{click.ip || '-'}</td>
                      <td>{click.lat ? `${click.lat.toFixed(4)}, ${click.lng.toFixed(4)}` : '-'}</td>
                      <td>{click.client_lat ? `${click.client_lat.toFixed(4)}, ${click.client_lng.toFixed(4)}` : '-'}</td>
                      <td className="address-cell" title={click.address || ''}>{click.address || '-'}</td>
                      <td className="address-cell" title={click.user_agent || ''}>{click.user_agent ? click.user_agent.substring(0, 40) + '...' : '-'}</td>
                      <td>
                        {click.fingerprint && (
                          <button className="btn btn-sm btn-secondary" onClick={() => setExpandedFp(expandedFp === click.id ? null : click.id)}>FP</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {expandedFp && (
              <div className="fp-section">
                <h4 className="mb-12">Device Fingerprint</h4>
                <FingerprintView data={allClicks.find(c => c.id === expandedFp)?.fingerprint} />
              </div>
            )}
            {hasMore && (
              <div className="flex justify-center mt-12">
                <button className="btn btn-sm" onClick={() => setPage(p => p + 1)}>Load More</button>
              </div>
            )}
          </>
        )}
      </div>

      {(serverPoints.length > 0 || clientPoints.length > 0) && (
        <div className="card">
          <h3 className="mb-12">Click Locations</h3>
          <ClickMap serverPoints={serverPoints} clientPoints={clientPoints} />
        </div>
      )}
    </div>
  );
}