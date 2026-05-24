import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { IconBuilding, IconKey } from '../components/Icons';

export function RegisterOrgPage({ setActivePage }) {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    org_name: '',
    admin_name: '',
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await register(formData);
      setActivePage('dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: '50px auto', padding: '0 20px' }}>
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
            <IconBuilding size={22} />
          </div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)', marginBottom: 6 }}>
            Onboard Issuing Organization
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Universities, accreditation councils, and credentialing bodies
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

        <div style={{
          background: 'var(--bg-vault)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: 20,
          display: 'flex',
          gap: 10,
          fontSize: '0.8rem',
          color: 'var(--text-secondary)'
        }}>
          <IconKey size={18} color="var(--accent-verified)" />
          <div>
            During onboarding, the server provisions a unique <strong>ECDSA P-256 keypair</strong>. Your private signing key is encrypted at rest using AES-256-GCM and never exposed.
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Organization / University Name</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Oxford Institute of Technology"
              value={formData.org_name}
              onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Administrator Full Name</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Dr. Eleanor Vance"
              value={formData.admin_name}
              onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Official Work Email</label>
            <input
              type="email"
              required
              className="input-field"
              placeholder="registrar@oxford-tech.ac.uk"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Master Account Password</label>
            <input
              type="password"
              required
              className="input-field"
              placeholder="At least 6 characters"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ width: '100%', marginTop: 8 }}
          >
            {isLoading ? 'Generating Keys & Provisioning...' : 'Register & Generate Signing Keys'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          Already registered?{' '}
          <span
            onClick={() => setActivePage('login')}
            style={{ color: 'var(--accent-verified)', cursor: 'pointer', fontWeight: 600 }}
          >
            Sign In here
          </span>
        </div>
      </div>
    </div>
  );
}
