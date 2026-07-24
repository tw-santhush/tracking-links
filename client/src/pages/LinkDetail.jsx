import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import ClickMap from '../components/ClickMap';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const API = '/api';

function parseBrowser(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('MSIE') || ua.includes('Trident')) return 'Internet Explorer';
  return 'Other';
}

function parseOS(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac OS') || ua.includes('Macintosh')) return 'macOS';
  if (ua.includes('Linux') && !ua.includes('Android')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  return 'Other';
}

function groupBy(arr, keyFn) {
  const map = {};
  arr.forEach(item => {
    const k = keyFn(item);
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

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

  useEffect(() => {
    fetch(`${API}/links/${id}?page=${page}&limit=20`, { credentials: 'include' })
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
  }, [id, page]);

  if (error) return <p className="error">{error}</p>;
  if (!data) return <p>Loading...</p>;

  const { link, clicks, total, hasMore } = data;
  const baseUrl = window.location.origin;
  const serverPoints = allClicks.filter(c => c.lat && c.lng).map(c => ({ lat: c.lat, lng: c.lng, address: c.address }));
  const clientPoints = allClicks.filter(c => c.client_lat && c.client_lng).map(c => ({ lat: c.client_lat, lng: c.client_lng }));

  const dailyGroups = groupBy(allClicks, c => c.timestamp ? c.timestamp.split(' ')[0] : 'Unknown');
  const days = Object.keys(dailyGroups).sort();
  const dailyData = {
    labels: days,
    datasets: [{
      label: 'Clicks per Day',
      data: days.map(d => dailyGroups[d]),
      backgroundColor: '#0f3460',
    }]
  };

  const browserGroups = groupBy(allClicks, c => parseBrowser(c.user_agent));
  const browserData = {
    labels: Object.keys(browserGroups),
    datasets: [{
      data: Object.values(browserGroups),
      backgroundColor: ['#0f3460', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#95a5a6'],
    }]
  };

  const osGroups = groupBy(allClicks, c => parseOS(c.user_agent));
  const osData = {
    labels: Object.keys(osGroups),
    datasets: [{
      data: Object.values(osGroups),
      backgroundColor: ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#95a5a6'],
    }]
  };

  const exportUrl = (fmt) => `${API}/links/${id}/export/${fmt}`;

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

      {clicks.length > 0 && (
        <div className="card">
          <h3 className="mb-12">Analytics</h3>
          <div className="charts-grid">
            <div className="chart-box">
              <h4 className="chart-title">Clicks per Day</h4>
              <Bar data={dailyData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
            </div>
            <div className="chart-box">
              <h4 className="chart-title">Browsers</h4>
              <Pie data={browserData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
            </div>
            <div className="chart-box">
              <h4 className="chart-title">Operating Systems</h4>
              <Pie data={osData} options={{ responsive: true, plugins: { legend: { position: 'bottom' } } }} />
            </div>
          </div>
        </div>
      )}

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