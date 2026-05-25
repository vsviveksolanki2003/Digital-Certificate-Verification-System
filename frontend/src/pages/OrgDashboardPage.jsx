import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { IssueCertificateModal } from '../components/IssueCertificateModal';
import { CertificateDetailModal } from '../components/CertificateDetailModal';
import { RevocationModal } from '../components/RevocationModal';
import {
  IconFileText,
  IconShieldCheck,
  IconAlertTriangle,
  IconSearch,
  IconDownload,
  IconKey,
  IconBuilding,
  IconUsers
} from '../components/Icons';

export function OrgDashboardPage({ setActivePage, onSelectVerifyCert }) {
  const { user, organization } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, revoked: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [selectedCertId, setSelectedCertId] = useState(null);
  const [certToRevoke, setCertToRevoke] = useState(null);

  useEffect(() => {
    loadCertificates();
  }, [statusFilter]);

  const loadCertificates = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;

      const res = await api.listCertificates(params);
      setCertificates(res.certificates || []);
      setStats(res.pagination || { total: 0, active: 0, revoked: 0 });
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadCertificates();
  };

  const handleCertificateIssued = (newCert) => {
    loadCertificates();
    setSelectedCertId(newCert.id);
  };

  const handleRevocationComplete = () => {
    loadCertificates();
    setCertToRevoke(null);
  };

  const handleDownloadPdf = async (cert, e) => {
    e.stopPropagation();
    try {
      await api.downloadCertificatePdf(cert.id, cert.recipient_name);
    } catch (err) {
      alert('Could not download PDF: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 20px 80px' }}>
      {/* Top Banner */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 28
      }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Issuing Authority Workspace
          </div>
          <h1 style={{ fontSize: '1.85rem', color: 'var(--text-primary)' }}>
            {organization?.name || user?.org_name || 'Organization Dashboard'}
          </h1>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: 12, alignItems: 'center', marginTop: 4 }}>
            <span>Admin: <strong>{user?.name}</strong></span>
            <span>Role: <strong style={{ color: 'var(--accent-identity)' }}>{user?.role.toUpperCase()}</strong></span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            onClick={() => setIsIssueModalOpen(true)}
          >
            <IconFileText size={18} />
            Issue New Certificate
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        <div className="vault-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Total Issued
            </span>
            <IconFileText size={20} color="var(--accent-identity)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Cryptographically sealed
          </div>
        </div>

        <div className="vault-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Active Credentials
            </span>
            <IconShieldCheck size={20} color="var(--accent-verified)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-verified)' }}>
            {stats.active}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Valid upon verification
          </div>
        </div>

        <div className="vault-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Revoked Credentials
            </span>
            <IconAlertTriangle size={20} color="var(--accent-revoked)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-revoked)' }}>
            {stats.revoked}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Permanently invalidated
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="vault-card" style={{ marginBottom: 24, padding: '16px 20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search recipient, course title, or UUID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: 38 }}
            />
            <div style={{ position: 'absolute', left: 12, top: 12, color: 'var(--text-muted)' }}>
              <IconSearch size={16} />
            </div>
          </div>

          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 160 }}
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="revoked">Revoked Only</option>
          </select>

          <button type="submit" className="btn btn-secondary">
            Filter
          </button>
        </form>
      </div>

      {/* Certificates Table */}
      <div className="vault-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Issued Certificates Directory
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {certificates.length} credentials
          </span>
        </div>

        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading credentials from cryptographic database...
          </div>
        ) : certificates.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No certificates found matching criteria. Click "Issue New Certificate" above to generate your first verified credential.
          </div>
        ) : (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="vault-table">
              <thead>
                <tr>
                  <th>Recipient Name</th>
                  <th>Degree / Program</th>
                  <th>Issue Date</th>
                  <th>Certificate UUID</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr
                    key={cert.id}
                    onClick={() => setSelectedCertId(cert.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {cert.recipient_name}
                    </td>
                    <td>{cert.title}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{cert.issue_date}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--accent-identity)' }}>
                      {cert.id.substring(0, 18)}...
                    </td>
                    <td>
                      <StatusBadge status={cert.status} />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          className="btn btn-outline"
                          title="Download PDF"
                          onClick={(e) => handleDownloadPdf(cert, e)}
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        >
                          <IconDownload size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <IssueCertificateModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onCertificateIssued={handleCertificateIssued}
      />

      <CertificateDetailModal
        isOpen={!!selectedCertId}
        certificateId={selectedCertId}
        onClose={() => setSelectedCertId(null)}
        onRevokeClick={(cert) => setCertToRevoke(cert)}
        onVerifyClick={(id) => {
          onSelectVerifyCert(id);
          setActivePage('verify');
        }}
      />

      <RevocationModal
        isOpen={!!certToRevoke}
        certificate={certToRevoke}
        onClose={() => setCertToRevoke(null)}
        onRevocationComplete={handleRevocationComplete}
      />
    </div>
  );
}
