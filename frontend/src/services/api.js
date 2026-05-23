const API_BASE = '/api';

/**
 * Custom fetch wrapper that attaches Bearer token and parses JSON
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('vault_token');
  const headers = { ...options.headers };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is NOT FormData, set application/json
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    if (!response.ok) {
      throw new Error('Failed to download PDF document');
    }
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  register: (payload) => request('/auth/register', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  getProfile: () => request('/auth/me'),
  inviteStaff: (payload) => request('/auth/invite-staff', { method: 'POST', body: payload }),

  // Certificates
  listCertificates: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/certificates${query ? `?${query}` : ''}`);
  },
  getCertificate: (id) => request(`/certificates/${id}`),
  issueCertificate: (formData) => request('/certificates', { method: 'POST', body: formData }),
  revokeCertificate: (id, reason) => request(`/certificates/${id}/revoke`, { method: 'PATCH', body: { reason } }),
  getCertificateHistory: (id) => request(`/certificates/${id}/history`),
  downloadCertificatePdf: async (id, recipientName) => {
    const blob = await request(`/certificates/${id}/pdf`);
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificate-${(recipientName || 'Credential').replace(/\s+/g, '_')}-${id.substring(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },

  // Verification (Public)
  verifyCertificate: (id) => request(`/verify/${id}`),
  compareFile: (id, formData) => request(`/verify/${id}/compare-file`, { method: 'POST', body: formData }),

  // Super Admin
  getAdminStats: () => request('/admin/stats'),
  getAdminOrganizations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/organizations${query ? `?${query}` : ''}`);
  },
  updateOrgStatus: (id, status) => request(`/admin/organizations/${id}/status`, { method: 'PATCH', body: { status } }),
  getAdminAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/admin/audit-logs${query ? `?${query}` : ''}`);
  },

  // Demo simulator
  tamperCertificate: (id, payload = {}) => request(`/demo/tamper/${id}`, { method: 'POST', body: payload }),
  restoreCertificate: (id) => request(`/demo/restore/${id}`, { method: 'POST' })
};
