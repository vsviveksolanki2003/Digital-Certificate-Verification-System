import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { IconShieldAlert, IconShieldCheck, IconSearch, IconAlertTriangle } from '../components/Icons';

export function TamperDemoPage({ onSelectVerifyCert, setActivePage }) {
  const [certificates, setCertificates] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);
  const [forgedName, setForgedName] = useState('');
  const [forgedTitle, setForgedTitle] = useState('');
  const [tamperStatus, setTamperStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadActiveCertificates();
  }, []);

  const loadActiveCertificates = async () => {
    try {
      const res = await api.listCertificates({ status: 'active' }).catch(() => ({ certificates: [] }));
      setCertificates(res.certificates || []);
      if (res.certificates && res.certificates.length > 0) {
        setSelectedCert(res.certificates[0]);
        setForgedName(`${res.certificates[0].recipient_name} [FORGED]`);
        setForgedTitle(res.certificates[0].title);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCert = (cert) => {
    setSelectedCert(cert);
    setForgedName(`${cert.recipient_name} [FORGED]`);
    setForgedTitle(cert.title);
    setTamperStatus('');
  };

  const handleSimulateTamper = async () => {
    if (!selectedCert) return;
    setIsLoading(true);
    setTamperStatus('');

    try {
      await api.tamperCertificate(selectedCert.id, {
        tampered_name: forgedName,
        tampered_title: forgedTitle
      });
      setTamperStatus('tampered');
    } catch (err) {
      alert('Simulation error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedCert) return;
    setIsLoading(true);

    try {
      await api.restoreCertificate(selectedCert.id);
      setTamperStatus('restored');
      loadActiveCertificates();
    } catch (err) {
      alert('Restore error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 20px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--accent-tampered-bg)',
          color: 'var(--accent-tampered)',
          padding: '4px 12px',
          borderRadius: 999,
          fontSize: '0.8rem',
          fontWeight: 700,
          marginBottom: 12
        }}>
          <IconShieldAlert size={16} />
          CRYPTOGRAPHIC INTEGRITY & FORGERY LAB
        </div>

        <h1 style={{ fontSize: '2.3rem', color: 'var(--text-primary)', marginBottom: 10 }}>
          Simulate Document Tampering
        </h1>

        <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: 640, margin: '0 auto' }}>
          Test the system's tamper-evidence. Because every certificate is sealed with an <strong>ECDSA P-256 digital signature</strong> computed over a canonical SHA-256 hash, any unauthorized change to recipient or title renders the signature mathematically invalid.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        {/* Step 1: Select Certificate */}
        <div className="vault-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: 12, color: 'var(--text-primary)' }}>
            1. Select Genuine Certificate
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Pick an active issued credential to test tampering on:
          </p>

          {certificates.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              No active certificates found. Please log in and issue a certificate or run seed.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {certificates.map((cert) => {
                const isSelected = selectedCert?.id === cert.id;
                return (
                  <div
                    key={cert.id}
                    onClick={() => handleSelectCert(cert)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'var(--bg-surface-elevated)' : 'var(--bg-vault)',
                      border: `1px solid ${isSelected ? 'var(--accent-verified)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{cert.recipient_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{cert.title}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--accent-identity)', marginTop: 4 }}>
                      {cert.id}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Forge and Verify */}
        <div className="vault-card">
          <h3 style={{ fontSize: '1.2rem', marginBottom: 12, color: 'var(--text-primary)' }}>
            2. Alter Credential Data
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Change the recipient name without having the private key to regenerate the signature:
          </p>

          <div className="input-group">
            <label className="input-label">Altered Recipient Name</label>
            <input
              type="text"
              className="input-field"
              value={forgedName}
              onChange={(e) => setForgedName(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Altered Credential Title</label>
            <input
              type="text"
              className="input-field"
              value={forgedTitle}
              onChange={(e) => setForgedTitle(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <button
              className="btn btn-danger"
              onClick={handleSimulateTamper}
              disabled={isLoading || !selectedCert}
              style={{ flex: 1 }}
            >
              <IconShieldAlert size={16} />
              Simulate Forgery
            </button>

            <button
              className="btn btn-outline"
              onClick={handleRestore}
              disabled={isLoading || !selectedCert}
            >
              Restore
            </button>
          </div>

          {tamperStatus === 'tampered' && (
            <div style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-tampered-bg)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--accent-tampered)',
              fontSize: '0.85rem'
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Credential Data Modified in DB!</div>
              <p style={{ marginBottom: 10 }}>
                The text has been modified, but the digital signature remains unchanged. Click below to run verification and observe the cryptographic rejection:
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onSelectVerifyCert(selectedCert.id);
                  setActivePage('verify');
                }}
                style={{ width: '100%' }}
              >
                <IconSearch size={16} />
                Verify Tampered Certificate Now
              </button>
            </div>
          )}

          {tamperStatus === 'restored' && (
            <div style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-verified-bg)',
              border: '1px solid rgba(0, 229, 153, 0.3)',
              color: 'var(--accent-verified)',
              fontSize: '0.85rem'
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Restored to Genuine State</div>
              <p style={{ marginBottom: 10 }}>
                The original recipient and title have been restored. Verifying now will show "AUTHENTIC & VERIFIED".
              </p>
              <button
                className="btn btn-primary"
                onClick={() => {
                  onSelectVerifyCert(selectedCert.id);
                  setActivePage('verify');
                }}
                style={{ width: '100%' }}
              >
                <IconSearch size={16} />
                Verify Restored Certificate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
