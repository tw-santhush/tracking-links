import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';

const API = '/api';

export default function Dashboard({ user }) {
  const [links, setLinks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [destination, setDestination] = useState('');
  const [label, setLabel] = useState('');
  const [slug, setSlug] = useState('');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [utms, setUtms] = useState({ source: '', medium: '', campaign: '' });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [error, setError] = useState('');
  const [showQr, setShowQr] = useState(null);

  const fetchLinks = (p) => {
    fetch(`${API}/links?page=${p || page}&limit=10`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setLinks(data.links);
        setTotal(data.total);
        setPage(data.page);
        setHasMore(data.hasMore);
      })
      .catch(() => {});
  };

  useEffect(() => fetchLinks(1), []);

  const createLink = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { destination, label, slug };
      if (password) body.password = password;
      if (expiresAt) body.expires_at = new Date(expiresAt).toISOString();
      if (utms.source) body.utm_source = utms.source;
      if (utms.medium) body.utm_medium = utms.medium;
      if (utms.campaign) body.utm_campaign = utms.campaign;

      const res = await fetch(`${API}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json();
        return setError(d.error);
      }
      setDestination(''); setLabel(''); setSlug(''); setPassword(''); setExpiresAt('');
      setUtms({ source: '', medium: '', campaign: '' });
      setShowAdvanced(false);
      fetchLinks(1);
    } catch {
      setError('Network error');
    }
  };

  const deleteLink = async (id) => {
    if (!confirm('Delete this link and all its clicks?')) return;
    await fetch(`${API}/links/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchLinks(1);
  };

  const baseUrl = window.location.origin;

  return (
    <div>
      <div className="card">
        <h2 className="mb-12">Create Tracking Link</h2>
        <form onSubmit={createLink}>
          <div className="form-group">
            <label>Destination URL</label>
            <input type="text" value={destination} onChange={e => setDestination(e.target.value)} placeholder="https://example.com" required />
          </div>
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Label</label>
              <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. sent to John" />
            </div>
            <div className="form-group flex-1">
              <label>Custom Slug (optional)</label>
              <input type="text" value={slug} onChange={e => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))} placeholder="my-custom-link" />
            </div>
          </div>
          <button type="button" className="btn btn-sm btn-secondary mb-12" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>
          {showAdvanced && (
            <div className="advanced-section">
              <div className="form-group">
                <label>Password Protection (optional)</label>
                <input type="text" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave empty for no password" />
              </div>
              <div className="form-group">
                <label>Expires At (optional)</label>
                <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group flex-1">
                  <label>UTM Source</label>
                  <input type="text" value={utms.source} onChange={e => setUtms({ ...utms, source: e.target.value })} placeholder="twitter" />
                </div>
                <div className="form-group flex-1">
                  <label>UTM Medium</label>
                  <input type="text" value={utms.medium} onChange={e => setUtms({ ...utms, medium: e.target.value })} placeholder="social" />
                </div>
                <div className="form-group flex-1">
                  <label>UTM Campaign</label>
                  <input type="text" value={utms.campaign} onChange={e => setUtms({ ...utms, campaign: e.target.value })} placeholder="summer-sale" />
                </div>
              </div>
            </div>
          )}
          <button type="submit" className="btn btn-primary">Create Link</button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>

      <div className="card">
        <div className="flex justify-between items-center mb-12">
          <h2>Your Links ({total})</h2>
        </div>
        {links.length === 0 ? (
          <p className="text-muted text-sm">No links yet. Create one above.</p>
        ) : (
          <>
            {links.map(link => (
              <div key={link.id} className="link-row">
                <div className="flex-1">
                  <div className="link-label">
                    {link.label || '(no label)'}
                    {link.password_hash && <span className="badge badge-warning ml-8">🔒</span>}
                    {link.expires_at && new Date(link.expires_at) < new Date() && <span className="badge badge-danger ml-8">Expired</span>}
                  </div>
                  <div className="link-url">{baseUrl}/r/{link.code}</div>
                </div>
                <div className="flex items-center gap-8">
                  <span className="click-count">{link.click_count} clicks</span>
                  <button className="btn btn-sm btn-secondary" onClick={() => setShowQr(showQr === link.id ? null : link.id)}>QR</button>
                  <Link to={`/links/${link.id}`} className="btn btn-sm">View</Link>
                  <button className="btn btn-sm btn-danger" onClick={() => deleteLink(link.id)}>Delete</button>
                </div>
                {showQr === link.id && (
                  <div className="qr-popup">
                    <QRCodeCanvas value={`${baseUrl}/r/${link.code}`} size={140} />
                  </div>
                )}
              </div>
            ))}
            {total > 10 && (
              <div className="flex items-center justify-center gap-8 mt-12">
                <button className="btn btn-sm" disabled={page <= 1} onClick={() => fetchLinks(page - 1)}>Prev</button>
                <span className="text-sm text-muted">Page {page} of {Math.ceil(total / 10)}</span>
                <button className="btn btn-sm" disabled={!hasMore} onClick={() => fetchLinks(page + 1)}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}