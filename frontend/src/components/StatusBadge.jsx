import React from 'react';
import { IconShieldCheck, IconAlertTriangle, IconShieldAlert, IconX } from './Icons';

export function StatusBadge({ status, size = 'normal' }) {
  const isLarge = size === 'large';
  const padding = isLarge ? '8px 16px' : '4px 10px';
  const fontSize = isLarge ? '0.88rem' : '0.76rem';
  const iconSize = isLarge ? 18 : 14;

  switch (status?.toLowerCase()) {
    case 'valid':
    case 'active':
      return (
        <span className="badge badge-valid" style={{ padding, fontSize }}>
          <IconShieldCheck size={iconSize} color="var(--accent-verified)" />
          {status === 'active' ? 'ACTIVE' : 'AUTHENTIC & VERIFIED'}
        </span>
      );
    case 'revoked':
      return (
        <span className="badge badge-revoked" style={{ padding, fontSize }}>
          <IconAlertTriangle size={iconSize} color="var(--accent-revoked)" />
          REVOKED CREDENTIAL
        </span>
      );
    case 'invalid':
    case 'tampered':
      return (
        <span className="badge badge-invalid" style={{ padding, fontSize }}>
          <IconShieldAlert size={iconSize} color="var(--accent-tampered)" />
          SIGNATURE MISMATCH / TAMPERED
        </span>
      );
    case 'not_found':
      return (
        <span className="badge badge-neutral" style={{ padding, fontSize }}>
          <IconX size={iconSize} color="var(--text-muted)" />
          NOT IN REGISTRY
        </span>
      );
    default:
      return (
        <span className="badge badge-neutral" style={{ padding, fontSize }}>
          {status || 'UNKNOWN'}
        </span>
      );
  }
}
