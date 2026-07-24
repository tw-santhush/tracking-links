import { useState } from 'react';
import { Link } from 'react-router-dom';

const API = '/api';

export default function Register({ onRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      onRegister(data);
    } catch {
      setError('Network error');
    }
  };

  return (
    <div className="card form-card">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Register</button>
        {error && <p className="error">{error}</p>}
      </form>
      <p className="text-sm text-muted mt-12">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}