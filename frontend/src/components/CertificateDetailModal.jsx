import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';
import { StatusBadge } from './StatusBadge';
import { IconX, IconDownload, IconKey, IconActivity, IconAlertTriangle } from './Icons';

export function CertificateDetailModal({ isOpen, onClose, certificateId, onRevokeClick, onVerifyClick }) {
  const [cert, setCert] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && certificateId) {
      loadDetails();
    }
  }, [isOpen, certificateId]);

  const loadDetails = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await api.getCertificate(certificateId);
      setCert(data.certificate);

      const histData = await api.getCertificateHistory(certificateId).catch(() => ({ history: [] }));
      setHistory(histData.history || []);
    } catch (err) {
      setError(err.message || 'Failed to load certificate details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!cert) return;
    try {
      await api.downloadCertificatePdf(cert.id, cert.recipient_name);
    } catch (err) {
      alert('Failed to download PDF: ' + err.message);
    }
  };

  if (!isOpen) return null;

  const verificationUrl = `${window.location.origin}/verify/${certificateId}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(7, 10, 15, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16
    }}>
      <div className="vault-card" style={{ maxWidth: 740, width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <IconX size={20} />
        </button>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading cryptographic certificate details...
          </div>
        ) : error ? (
          <div style={{ padding: 20, color: 'var(--accent-tampered)' }}>{error}</div>
        ) : cert ? (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Certificate Record Detail
                </div>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--text-primary)' }}>
                  {cert.recipient_name}
                </h2>
                <div style={{ color: 'var(--accent-verified)', fontWeight: 500 }}>
                  {cert.title}
                </div>
              </div>
              <StatusBadge status={cert.status} size="large" />
            </div>

            {/* Revocation notice if revoked */}
            {cert.status === 'revoked' && cert.revocation && (
              <div style={{
                background: 'var(--accent-revoked-bg)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 20,
                color: 'var(--accent-revoked)',
                fontSize: '0.85rem'
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>REVOCATION DETAILS</div>
                <div>Reason: {cert.revocation.reason}</div>
                <div style={{ fontSize: '0.75rem', marginTop: 4 }}>
                  Revoked on: {new Date(cert.revocation.revoked_at).toLocaleString()} by {cert.revocation.revoked_by_name}
                </div>
              </div>
            )}

            {/* QR Code and Actions section */}
            <div style={{
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap',
              background: 'var(--bg-vault)',
              padding: 20,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 24
            }}>
              {/* QR display */}
              <div style={{
                background: '#FFFFFF',
                padding: 12,
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                alignSelf: 'flex-start'
              }}>
                <QRCodeSVG
                  value={verificationUrl}
                  size={140}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Action details */}
              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                  PUBLIC VERIFICATION URL
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  color: 'var(--accent-identity)',
                  background: 'var(--bg-surface)',
                  padding: '8px 12px',
                  borderRadius: 4,
                  wordBreak: 'break-all',
                  marginBottom: 14
                }}>
                  {verificationUrl}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" onClick={handleDownloadPdf} style={{ fontSize: '0.85rem' }}>
                    <IconDownload size={16} />
                    Download PDF Certificate
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      onClose();
                      onVerifyClick(cert.id);
                    }}
                    style={{ fontSize: '0.85rem' }}
                  >
                    Open Public Verification
                  </button>

                  {cert.status === 'active' && (
                    <button
                      className="btn btn-danger"
                      onClick={() => {
                        onClose();
                        onRevokeClick(cert);
                      }}
                      style={{ fontSize: '0.85rem' }}
                    >
                      <IconAlertTriangle size={16} />
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Cryptographic Specifications */}
            <div style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              fontSize: '0.82rem',
              marginBottom: 24
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent-verified)', fontWeight: 600, marginBottom: 10 }}>
                <IconKey size={16} />
                Cryptographic Attestation Metadata
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>UUID: </span>
                  <span style={{ fontFamily: 'var(--font-mono)' }}>{cert.id}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Signature: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{cert.signature?.substring(0, 45)}...</span>
                </div>
                {cert.file_hash && (
                  <div>
                    <span style={{ color: 'var(--text-muted)' }}>File SHA-256: </span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#FDE047' }}>{cert.file_hash}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Verification History Log */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <IconActivity size={18} color="var(--accent-identity)" />
                <h4 style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                  Verification Audit History ({history.length} attempts)
                </h4>
              </div>

              {history.length === 0 ? (
                <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.85rem', background: 'var(--bg-vault)', borderRadius: 'var(--radius-sm)' }}>
                  No verification scans recorded yet for this credential.
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: 220, overflowY: 'auto' }}>
                  <table className="vault-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Verifier IP</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((h) => (
                        <tr key={h.id}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                            {new Date(h.verified_at).toLocaleString()}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {h.verifier_ip}
                          </td>
                          <td>
                            <StatusBadge status={h.result} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
