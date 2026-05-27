import React from 'react';
import { useAuth } from '../context/AuthContext';
import { IconShieldCheck, IconSearch, IconActivity, IconBuilding, IconLock } from './Icons';

export function Navbar({ activePage, setActivePage }) {
  const { user, logout } = useAuth();

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(7, 10, 15, 0.85)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{
        maxWidth: 1240,
        margin: '0 auto',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* Brand */}
        <div 
          onClick={() => setActivePage('verify')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <div style={{
            width: 38,
            height: 38,
            borderRadius: 8,
            background: 'linear-gradient(135deg, rgba(0,229,153,0.2) 0%, rgba(14,20,32,1) 100%)',
            border: '1px solid var(--border-highlight)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-verified)'
          }}>
            <IconShieldCheck size={22} color="var(--accent-verified)" />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              fontWeight: 700,
              letterSpacing: '0.05em',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              DIGITAL CERTIFICATE VERIFICATION
              <span style={{
                fontSize: '0.65rem',
                padding: '2px 6px',
                background: 'var(--accent-verified-bg)',
                color: 'var(--accent-verified)',
                borderRadius: 4,
                fontFamily: 'var(--font-mono)',
                fontWeight: 600
              }}>ECDSA-P256</span>
            </div>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              Cryptographic Credential Registry
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className={`btn ${activePage === 'verify' ? 'btn-secondary' : 'btn-outline'}`}
            onClick={() => setActivePage('verify')}
            style={{ fontSize: '0.85rem', padding: '8px 14px' }}
          >
            <IconSearch size={16} />
            Verify Document
          </button>

          <button
            className={`btn ${activePage === 'tamper-demo' ? 'btn-secondary' : 'btn-outline'}`}
            onClick={() => setActivePage('tamper-demo')}
            style={{ fontSize: '0.85rem', padding: '8px 14px' }}
          >
            <IconActivity size={16} />
            Tamper Demo Lab
          </button>

          {user && (user.role === 'org_admin' || user.role === 'org_staff') && (
            <button
              className={`btn ${activePage === 'dashboard' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActivePage('dashboard')}
              style={{ fontSize: '0.85rem', padding: '8px 14px' }}
            >
              <IconBuilding size={16} />
              Org Portal
            </button>
          )}

          {user && user.role === 'super_admin' && (
            <button
              className={`btn ${activePage === 'admin' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActivePage('admin')}
              style={{ fontSize: '0.85rem', padding: '8px 14px' }}
            >
              <IconLock size={16} />
              Super Admin
            </button>
          )}

          {/* User Session status */}
          <div style={{ height: 24, width: 1, background: 'var(--border-subtle)', margin: '0 4px' }} />

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {user.name}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {user.org_name || user.role.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <button
                className="btn btn-outline"
                onClick={logout}
                style={{ fontSize: '0.8rem', padding: '6px 12px' }}
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                className="btn btn-outline"
                onClick={() => setActivePage('login')}
                style={{ fontSize: '0.85rem', padding: '8px 14px' }}
              >
                Sign In
              </button>
              <button
                className="btn btn-primary"
                onClick={() => setActivePage('register')}
                style={{ fontSize: '0.85rem', padding: '8px 14px' }}
              >
                Register Org
              </button>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
