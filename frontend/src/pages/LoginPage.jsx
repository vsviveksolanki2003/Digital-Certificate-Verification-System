import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IconLock, IconBuilding, IconShieldCheck } from '../components/Icons';

export function LoginPage({ setActivePage }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'super_admin') {
        setActivePage('admin');
      } else {
        setActivePage('dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
  };

  return (
    <div style={{ maxWidth: 460, margin: '60px auto', padding: '0 20px' }}>
      <div className="vault-card vault-card-glow">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 10,
            background: 'var(--accent-verified-bg)',
            border: '1px solid rgba(0, 229, 153, 0.3)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-verified)',
            marginBottom: 12
          }}>
            <IconLock size={22} />
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: 6 }}>
            Sign In to Vault
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Access organization management and certificate issuing
          </p>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--accent-tampered-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--accent-tampered)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: 18
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Email Address</label>
            <input
              type="email"
              required
              className="input-field"
              placeholder="user@organization.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {isLoading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Demo Quick Login Credentials:
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleQuickLogin('alice@mit-crypto.edu', 'MitSecure2026!')}
              style={{ fontSize: '0.78rem', justifyContent: 'flex-start', padding: '6px 12px' }}
            >
              <IconBuilding size={14} />
              Org Admin: alice@mit-crypto.edu
            </button>

            <button
              type="button"
              className="btn btn-outline"
              onClick={() => handleQuickLogin('admin@vault.veritas.gov', 'AdminSecret2026!')}
              style={{ fontSize: '0.78rem', justifyContent: 'flex-start', padding: '6px 12px' }}
            >
              <IconShieldCheck size={14} />
              Super Admin: admin@vault.veritas.gov
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: 18, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Need to onboard an issuing authority?{' '}
            <span
              onClick={() => setActivePage('register')}
              style={{ color: 'var(--accent-verified)', cursor: 'pointer', fontWeight: 600 }}
            >
              Register Organization
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
