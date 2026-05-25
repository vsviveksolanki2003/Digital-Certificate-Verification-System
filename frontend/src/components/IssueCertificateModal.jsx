import React, { useState } from 'react';
import { api } from '../services/api';
import { IconFileText, IconX, IconLock } from './Icons';

export function IssueCertificateModal({ isOpen, onClose, onCertificateIssued }) {
  const [formData, setFormData] = useState({
    recipient_name: '',
    title: '',
    issue_date: new Date().toISOString().split('T')[0]
  });
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const data = new FormData();
      data.append('recipient_name', formData.recipient_name);
      data.append('title', formData.title);
      data.append('issue_date', formData.issue_date);
      if (file) {
        data.append('file', file);
      }

      const res = await api.issueCertificate(data);
      onCertificateIssued(res.certificate);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to issue certificate');
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
      <div className="vault-card" style={{ maxWidth: 520, width: '100%', position: 'relative' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: 'var(--accent-verified-bg)',
            color: 'var(--accent-verified)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <IconFileText size={20} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)' }}>
              Issue Cryptographic Certificate
            </h3>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Payload will be hashed with SHA-256 and signed with ECDSA
            </div>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '10px 14px',
            background: 'var(--accent-tampered-bg)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: 'var(--accent-tampered)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            margin: '16px 0'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
          <div className="input-group">
            <label className="input-label">Recipient Full Legal Name</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Dr. Jane Goodall"
              value={formData.recipient_name}
              onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Degree, Course or Credential Title</label>
            <input
              type="text"
              required
              className="input-field"
              placeholder="e.g. Master of Science in Cyber Security"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Date of Issuance</label>
            <input
              type="date"
              required
              className="input-field"
              value={formData.issue_date}
              onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Optional Original Document Asset</label>
            <input
              type="file"
              className="input-field"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              If uploaded, the server will compute its SHA-256 checksum and bind it into the cryptographic signature.
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading}>
              <IconLock size={16} />
              {isLoading ? 'Signing & Storing...' : 'Sign & Issue Credential'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
