import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { PublicVerifyPage } from './pages/PublicVerifyPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterOrgPage } from './pages/RegisterOrgPage';
import { OrgDashboardPage } from './pages/OrgDashboardPage';
import { SuperAdminPage } from './pages/SuperAdminPage';
import { TamperDemoPage } from './pages/TamperDemoPage';
import { IconShieldCheck } from './components/Icons';

function AppContent() {
  const { user, loading } = useAuth();
  const [activePage, setActivePage] = useState('verify');
  const [verifyCertId, setVerifyCertId] = useState('');

  // Read URL path on mount (e.g. /verify/:id)
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/verify/')) {
      const id = path.replace('/verify/', '').split('/')[0];
      if (id) {
        setVerifyCertId(id);
        setActivePage('verify');
      }
    }
  }, []);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-vault)',
        color: 'var(--text-secondary)'
      }}>
        Initializing Cryptographic Attestation Vault...
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar activePage={activePage} setActivePage={setActivePage} />

      <main style={{ flex: 1 }}>
        {activePage === 'verify' && (
          <PublicVerifyPage
            initialCertId={verifyCertId}
            onSelectTamperDemo={() => setActivePage('tamper-demo')}
          />
        )}

        {activePage === 'login' && (
          <LoginPage setActivePage={setActivePage} />
        )}

        {activePage === 'register' && (
          <RegisterOrgPage setActivePage={setActivePage} />
        )}

        {activePage === 'dashboard' && (
          user ? (
            <OrgDashboardPage
              setActivePage={setActivePage}
              onSelectVerifyCert={(id) => setVerifyCertId(id)}
            />
          ) : (
            <LoginPage setActivePage={setActivePage} />
          )
        )}

        {activePage === 'admin' && (
          user && user.role === 'super_admin' ? (
            <SuperAdminPage />
          ) : (
            <LoginPage setActivePage={setActivePage} />
          )
        )}

        {activePage === 'tamper-demo' && (
          <TamperDemoPage
            onSelectVerifyCert={(id) => setVerifyCertId(id)}
            setActivePage={setActivePage}
          />
        )}
      </main>

      {/* Institutional Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
        padding: '30px 20px',
        fontSize: '0.82rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IconShieldCheck size={18} color="var(--accent-verified)" />
            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>VERITAS VAULT</span>
            <span>—</span>
            <span>Cryptographically Verified Document & Credential Registry</span>
          </div>

          <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            <span>ECDSA NIST P-256</span>
            <span>SHA-256 CANONICAL</span>
            <span>AES-256-GCM AT REST</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
