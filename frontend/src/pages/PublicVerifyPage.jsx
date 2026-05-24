import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { QrScannerModal } from '../components/QrScannerModal';
import {
  IconSearch,
  IconCamera,
  IconShieldCheck,
  IconShieldAlert,
  IconAlertTriangle,
  IconDownload,
  IconKey,
  IconFileText,
  IconLock
} from '../components/Icons';

export function PublicVerifyPage({ initialCertId = '', onSelectTamperDemo }) {
  const [certId, setCertId] = useState(initialCertId);
  const [isLoading, setIsLoading] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // File integrity comparison state
  const [compareFile, setCompareFile] = useState(null);
  const [compareResult, setCompareResult] = useState(null);
  const [isComparingFile, setIsComparingFile] = useState(false);

  useEffect(() => {
    if (initialCertId) {
      handleVerify(initialCertId);
    }
  }, [initialCertId]);

  const handleVerify = async (idToVerify) => {
    const id = (idToVerify || certId).trim();
    if (!id) {
      setErrorMsg('Please enter a Certificate ID or scan a QR code');
      return;
    }

    setErrorMsg('');
    setIsLoading(true);
    setVerifyResult(null);
    setCompareResult(null);

    try {
      const res = await api.verifyCertificate(id);
      setVerifyResult(res);

      if (res.result === 'valid') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#00E599', '#38BDF8', '#F8FAFC']
        });
      }
    } catch (err) {
      if (err.status === 404) {
        setVerifyResult({
          result: 'not_found',
          message: 'Certificate ID was not found in the official registry.',
          certificate_id: id
        });
      } else {
        setErrorMsg(err.message || 'An error occurred while verifying the certificate.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompareFile = async (e) => {
    e.preventDefault();
    if (!compareFile || !verifyResult?.certificate?.id) return;

    setIsComparingFile(true);
    setCompareResult(null);

    try {
      const formData = new FormData();
      formData.append('file', compareFile);
      const res = await api.compareFile(verifyResult.certificate.id, formData);
      setCompareResult(res);
    } catch (err) {
      setCompareResult({
        result: 'error',
        message: err.message || 'Failed to compare document file'
      });
    } finally {
      setIsComparingFile(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!verifyResult?.certificate?.id) return;
    try {
      await api.downloadCertificatePdf(verifyResult.certificate.id, verifyResult.certificate.recipient_name);
    } catch (err) {
      alert('Could not download certificate PDF: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '40px 20px 80px' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'var(--accent-verified-bg)',
          border: '1px solid rgba(0, 229, 153, 0.3)',
          color: 'var(--accent-verified)',
          padding: '6px 14px',
          borderRadius: 999,
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '0.08em',
          marginBottom: 16
        }}>
          <IconShieldCheck size={16} />
          CRYPTOGRAPHIC VERIFICATION GATEWAY
        </div>

        <h1 style={{
          fontSize: '2.5rem',
          lineHeight: 1.2,
          color: 'var(--text-primary)',
          marginBottom: 14
        }}>
          Verify Any Document Instantly
        </h1>

        <p style={{
          fontSize: '1.05rem',
          color: 'var(--text-secondary)',
          maxWidth: 620,
          margin: '0 auto'
        }}>
          Confirm authenticity with mathematical certainty. Every certificate is cryptographically signed using the issuing authority's ECDSA P-256 private key and hashed with SHA-256.
        </p>
      </div>

      {/* Verification Input Card */}
      <div className="vault-card vault-card-glow" style={{ marginBottom: 32 }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerify();
          }}
          style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
        >
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Paste Certificate UUID (e.g. b6e14e6b-9d22-4b65-...)"
              value={certId}
              onChange={(e) => setCertId(e.target.value)}
              style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', paddingLeft: 42 }}
            />
            <div style={{ position: 'absolute', left: 14, top: 14, color: 'var(--text-muted)' }}>
              <IconSearch size={18} />
            </div>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsScannerOpen(true)}
            style={{ whiteSpace: 'nowrap' }}
          >
            <IconCamera size={18} />
            Scan QR
          </button>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={isLoading}
            style={{ minWidth: 140 }}
          >
            {isLoading ? 'Verifying...' : 'Verify Authenticity'}
          </button>
        </form>

        {errorMsg && (
          <div style={{
            marginTop: 16,
            padding: '10px 14px',
            background: 'var(--accent-tampered-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--accent-tampered)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem'
          }}>
            {errorMsg}
          </div>
        )}
      </div>

      {/* Verification Result Display */}
      {verifyResult && (
        <div className="vault-card animate-fade-in" style={{
          borderTop: `4px solid ${
            verifyResult.result === 'valid'
              ? 'var(--accent-verified)'
              : verifyResult.result === 'revoked'
              ? 'var(--accent-revoked)'
              : 'var(--accent-tampered)'
          }`
        }}>
          {/* Header Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 16,
            paddingBottom: 20,
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: 24
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                Verification Outcome
              </div>
              <StatusBadge status={verifyResult.result} size="large" />
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Attestation Timestamp
              </div>
              <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                {new Date(verifyResult.verified_at || Date.now()).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Outcome Details */}
          {verifyResult.result === 'valid' && (
            <div>
              <div style={{
                background: 'rgba(0, 229, 153, 0.05)',
                border: '1px solid rgba(0, 229, 153, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: 24,
                marginBottom: 24
              }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-verified)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                  Official Attestation
                </div>
                <h2 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', marginBottom: 8 }}>
                  {verifyResult.certificate.recipient_name}
                </h2>
                <div style={{ fontSize: '1.15rem', color: 'var(--accent-verified)', fontWeight: 500, marginBottom: 16 }}>
                  {verifyResult.certificate.title}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 16,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(0, 229, 153, 0.15)'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ISSUING INSTITUTION</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{verifyResult.issuer.name}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DATE OF ISSUANCE</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{verifyResult.certificate.issue_date}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CERTIFICATE UUID</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-identity)' }}>
                      {verifyResult.certificate.id}
                    </div>
                  </div>
                </div>
              </div>

              {/* Cryptographic Proof Card */}
              <div style={{
                background: 'var(--bg-vault)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 20,
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, color: 'var(--accent-verified)' }}>
                  <IconKey size={18} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Cryptographic Proof Audit
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Digital Signature Algorithm:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{verifyResult.security_details.signature_algorithm}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Payload SHA-256 Digest:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: '#FDE047', wordBreak: 'break-all' }}>
                      {verifyResult.security_details.payload_hash}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>Issuer Key Fingerprint:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-identity)' }}>
                      {verifyResult.issuer.public_key_fingerprint}
                    </span>
                  </div>
                </div>
              </div>

              {/* Optional Document File Hash Comparison */}
              <div style={{
                background: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: 20,
                marginBottom: 24
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--text-primary)' }}>
                  <IconFileText size={18} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                    Verify Digital Document File (SHA-256 Hash Matching)
                  </span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
                  If you hold the original digital file (PDF/Image), upload it below to verify that its byte-level SHA-256 hash matches the cryptographic seal.
                </p>

                <form onSubmit={handleCompareFile} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    onChange={(e) => setCompareFile(e.target.files?.[0] || null)}
                    style={{ fontSize: '0.85rem' }}
                  />
                  <button
                    type="submit"
                    className="btn btn-secondary"
                    disabled={!compareFile || isComparingFile}
                    style={{ fontSize: '0.85rem', padding: '6px 14px' }}
                  >
                    {isComparingFile ? 'Comparing Hash...' : 'Compare Document Hash'}
                  </button>
                </form>

                {compareResult && (
                  <div style={{
                    marginTop: 14,
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: compareResult.file_match ? 'var(--accent-verified-bg)' : 'var(--accent-tampered-bg)',
                    border: `1px solid ${compareResult.file_match ? 'rgba(0,229,153,0.3)' : 'rgba(239,68,68,0.3)'}`,
                    color: compareResult.file_match ? 'var(--accent-verified)' : 'var(--accent-tampered)',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{compareResult.message}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>
                      Uploaded: {compareResult.uploaded_file_hash}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={handleDownloadPdf}>
                  <IconDownload size={18} />
                  Download Official PDF Certificate
                </button>
              </div>
            </div>
          )}

          {/* Revoked State */}
          {verifyResult.result === 'revoked' && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: 24
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-revoked)', marginBottom: 12 }}>
                <IconAlertTriangle size={24} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  This Credential Has Been Officially Revoked
                </h3>
              </div>

              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                The issuing authority has invalidated this certificate. It is no longer recognized as valid or authentic.
              </p>

              <div style={{ background: 'var(--bg-vault)', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>OFFICIAL REASON FOR REVOCATION</div>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500, fontStyle: 'italic' }}>
                  "{verifyResult.revocation?.reason}"
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Recipient: </span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{verifyResult.certificate.recipient_name}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Course / Title: </span>
                  <span style={{ color: 'var(--text-primary)' }}>{verifyResult.certificate.title}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Revocation Date: </span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-revoked)' }}>
                    {new Date(verifyResult.revocation?.revoked_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Invalid / Tampered State */}
          {verifyResult.result === 'invalid' && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: 24
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--accent-tampered)', marginBottom: 12 }}>
                <IconShieldAlert size={26} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                  Security Alert: Cryptographic Signature Mismatch
                </h3>
              </div>

              <p style={{ fontSize: '0.92rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
                The cryptographic signature on this certificate does not correspond with the issuing authority's public key or the recorded certificate payload. This indicates the document has been altered, forged, or tampered with.
              </p>

              <div style={{ background: 'var(--bg-vault)', padding: 16, borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 6 }}>COMPUTED PAYLOAD HASH</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-tampered)', wordBreak: 'break-all' }}>
                  {verifyResult.security_details?.computed_hash}
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Target certificate: <strong style={{ color: 'var(--text-primary)' }}>{verifyResult.certificate?.recipient_name}</strong> — {verifyResult.certificate?.title}
              </div>
            </div>
          )}

          {/* Not Found State */}
          {verifyResult.result === 'not_found' && (
            <div style={{ textAlign: 'center', padding: '30px 20px' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: 8 }}>
                Certificate Not Found
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', maxWidth: 460, margin: '0 auto' }}>
                The certificate UUID <code style={{ color: 'var(--accent-identity)', fontFamily: 'var(--font-mono)' }}>{verifyResult.certificate_id}</code> was not found in the verified registry. Please check for typographical errors.
              </p>
            </div>
          )}
        </div>
      )}

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scannedId) => {
          setCertId(scannedId);
          handleVerify(scannedId);
        }}
      />
    </div>
  );
}
