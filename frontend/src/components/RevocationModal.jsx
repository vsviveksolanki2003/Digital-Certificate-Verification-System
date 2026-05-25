import React, { useState } from 'react';
import { api } from '../services/api';
import { IconAlertTriangle, IconX } from './Icons';

export function RevocationModal({ isOpen, onClose, certificate, onRevocationComplete }) {
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !certificate) return null;

  const handleRevoke = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please specify a revocation reason');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await api.revokeCertificate(certificate.id, reason);
      onRevocationComplete(certificate.id, reason);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to revoke certificate');
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="vault-card" style={{ maxWidth: 480, width: '100%', position: 'relative' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, color: 'var(--accent-revoked)' }}>
          <IconAlertTriangle size={24} />
          <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
            Revoke Certificate Credential
          </h3>
        </div>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
          You are about to revoke the credential issued to <strong style={{ color: 'var(--text-primary)' }}>{certificate.recipient_name}</strong> for <em>"{certificate.title}"</em>.
        </p>

        <div style={{
          background: 'var(--accent-revoked-bg)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          color: 'var(--accent-revoked)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          marginBottom: 16
        }}>
          <strong>Warning:</strong> Revocation is permanent and recorded into the immutable platform audit ledger. Future verification scans will immediately return "REVOKED".
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--accent-tampered-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--accent-tampered)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: 16
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRevoke}>
          <div className="input-group">
            <label className="input-label">Official Revocation Reason</label>
            <textarea
              required
              rows={3}
              className="input-field"
              placeholder="e.g. Academic honor council finding of honor code violation; or credential superseded by updated accreditation."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-danger" disabled={isLoading}>
              {isLoading ? 'Revoking Credential...' : 'Confirm Revocation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
