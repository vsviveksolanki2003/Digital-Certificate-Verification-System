import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { IconBuilding, IconFileText, IconShieldCheck, IconActivity, IconLock } from '../components/Icons';

export function SuperAdminPage() {
  const [stats, setStats] = useState(null);
  const [orgs, setOrgs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('orgs');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const statsRes = await api.getAdminStats();
      setStats(statsRes.stats);

      const orgsRes = await api.getAdminOrganizations();
      setOrgs(orgsRes.organizations || []);

      const logsRes = await api.getAdminAuditLogs({ limit: 50 });
      setAuditLogs(logsRes.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleOrgStatus = async (orgId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to change this organization's status to ${newStatus}?`)) {
      return;
    }

    try {
      await api.updateOrgStatus(orgId, newStatus);
      loadData();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px 80px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(56, 189, 248, 0.12)',
          color: 'var(--accent-identity)',
          padding: '4px 10px',
          borderRadius: 999,
          fontSize: '0.78rem',
          fontWeight: 700,
          marginBottom: 10
        }}>
          <IconLock size={14} />
          GLOBAL PLATFORM GOVERNANCE
        </div>
        <h1 style={{ fontSize: '2rem', color: 'var(--text-primary)' }}>
          Super Administrator Control Room
        </h1>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Platform-wide organization supervision and immutable cryptographic audit logs
        </p>
      </div>

      {/* Global Stats */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 32
        }}>
          <div className="vault-card" style={{ padding: 20 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Total Organizations
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.organizations.total}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-verified)' }}>
              {stats.organizations.active} Active
            </div>
          </div>

          <div className="vault-card" style={{ padding: 20 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Total Issued Credentials
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {stats.certificates.total}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-verified)' }}>
              {stats.certificates.active} Active
            </div>
          </div>

          <div className="vault-card" style={{ padding: 20 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Revocations Recorded
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-revoked)' }}>
              {stats.certificates.revoked}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Permanent invalidations
            </div>
          </div>

          <div className="vault-card" style={{ padding: 20 }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
              Verification Queries
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-identity)' }}>
              {stats.verifications.total}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Public scans processed
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 12 }}>
        <button
          className={`btn ${activeTab === 'orgs' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('orgs')}
          style={{ fontSize: '0.85rem' }}
        >
          <IconBuilding size={16} />
          Registered Organizations ({orgs.length})
        </button>

        <button
          className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('audit')}
          style={{ fontSize: '0.85rem' }}
        >
          <IconActivity size={16} />
          Immutable Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Tab Content: Organizations */}
      {activeTab === 'orgs' && (
        <div className="vault-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="vault-table">
              <thead>
                <tr>
                  <th>Organization Name</th>
                  <th>Official Email</th>
                  <th>Total Certs</th>
                  <th>Active / Revoked</th>
                  <th>Account Status</th>
                  <th style={{ textAlign: 'right' }}>Governance Action</th>
                </tr>
              </thead>
              <tbody>
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{org.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{org.email}</td>
                    <td style={{ fontWeight: 600 }}>{org.total_certificates || 0}</td>
                    <td style={{ fontSize: '0.82rem' }}>
                      <span style={{ color: 'var(--accent-verified)' }}>{org.active_certificates || 0} active</span> /{' '}
                      <span style={{ color: 'var(--accent-revoked)' }}>{org.revoked_certificates || 0} revoked</span>
                    </td>
                    <td>
                      <span className={`badge ${org.status === 'active' ? 'badge-valid' : 'badge-invalid'}`}>
                        {org.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className={`btn ${org.status === 'active' ? 'btn-danger' : 'btn-primary'}`}
                        onClick={() => handleToggleOrgStatus(org.id, org.status)}
                        style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                      >
                        {org.status === 'active' ? 'Suspend Org' : 'Activate Org'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab Content: Immutable Audit Trail */}
      {activeTab === 'audit' && (
        <div className="vault-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="vault-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action Event</th>
                  <th>Actor ID</th>
                  <th>Target Entity</th>
                  <th>Audit Context</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem' }}>
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {log.actor_id?.substring(0, 16)}...
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-identity)' }}>
                      {log.target_id ? `${log.target_id.substring(0, 16)}...` : 'N/A'}
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {typeof log.metadata === 'object' ? JSON.stringify(log.metadata) : log.metadata}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
