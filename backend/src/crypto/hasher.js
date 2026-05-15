const crypto = require('crypto');

/**
 * Computes SHA-256 hash of a file or byte buffer
 * @param {Buffer|string} data - Buffer or string
 * @returns {string} - 64-character lowercase hex string
 */
function hashBuffer(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Computes canonical SHA-256 hash of certificate payload attributes
 * @param {Object} payload - Certificate attributes
 * @returns {string} - 64-character lowercase hex string
 */
function hashCertificatePayload({ id, org_id, recipient_name, title, issue_date, file_hash = null }) {
  // Construct canonical JSON representation with sorted keys
  const canonicalObject = {
    file_hash: file_hash || null,
    id: String(id).trim(),
    issue_date: String(issue_date).trim(),
    org_id: String(org_id).trim(),
    recipient_name: String(recipient_name).trim(),
    title: String(title).trim()
  };

  const canonicalString = JSON.stringify(canonicalObject, Object.keys(canonicalObject).sort());
  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

module.exports = {
  hashBuffer,
  hashCertificatePayload
};
