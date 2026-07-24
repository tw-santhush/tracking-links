import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const API = '/api';

export default function Dashboard({ user }) {
  const [links, setLinks] = useState([]);
  const [destination, setDestination] = useState('');
  const [label, setLabel] = useState('');
  const [error, setError] = useState('');

  const fetchLinks = () => {
    fetch(`${API}/links`, { credentials: 'include' })
      .then(r => r.json())
      .then(setLinks)
      .catch(() => {});
  };

  useEffect(fetchLinks, []);

  const createLink = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ destination, label }),
      });
      if (!res.ok) {
        const d = await res.json();
        return setError(d.error);
      }
      setDestination('');
      setLabel('');
      fetchLinks();
    } catch {
      setError('Network error');
    }
  };

  const deleteLink = async (id) => {
    if (!confirm('Delete this link and all its clicks?')) return;
    await fetch(`${API}/links/${id}`, { method: 'DELETE', credentials: 'include' });
    fetchLinks();
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
          <div className="form-group">
            <label>Label (optional)</label>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. sent to John" />
          </div>
          <button type="submit" className="btn btn-primary">Create Link</button>
          {error && <p className="error">{error}</p>}
        </form>
      </div>

      <div className="card">
        <h2 className="mb-12">Your Links</h2>
        {links.length === 0 ? (
          <p className="text-muted text-sm">No links yet. Create one above.</p>
        ) : (
          links.map(link => (
            <div key={link.id} className="link-row">
              <div>
                <div className="link-label">{link.label || '(no label)'}</div>
                <div className="link-url">{baseUrl}/r/{link.code}</div>
              </div>
              <div className="flex items-center gap-8">
                <span className="click-count">{link.click_count} clicks</span>
                <Link to={`/links/${link.id}`} className="btn btn-sm">View</Link>
                <button className="btn btn-sm btn-danger" onClick={() => deleteLink(link.id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}