import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import LinkDetail from './pages/LinkDetail';

const API = '/api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="container"><p>Loading...</p></div>;

  return (
    <BrowserRouter>
      <nav className="navbar">
        <Link to="/" className="brand">Tracking Links</Link>
        <div className="nav-right">
          {user ? (
            <>
              <span className="user-email">{user.email}</span>
              <button
                className="btn btn-sm"
                onClick={() => {
                  fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' })
                    .then(() => setUser(null));
                }}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-sm">Login</Link>
              <Link to="/register" className="btn btn-sm">Register</Link>
            </>
          )}
        </div>
      </nav>
      <div className="container">
        <Routes>
          <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register onRegister={setUser} />} />
          <Route path="/links/:id" element={user ? <LinkDetail /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;