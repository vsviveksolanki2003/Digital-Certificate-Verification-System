const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { decryptKey } = require('../crypto/cipher');
const { hashBuffer, hashCertificatePayload } = require('../crypto/hasher');
const { signHash, verifySignature } = require('../crypto/signer');
const { logAudit } = require('./audit.service');

/**
 * Issues a new cryptographically signed certificate
 */
async function issueCertificate({ org_id, actor_id, recipient_name, title, issue_date, fileBuffer = null }) {
  // Fetch org to verify status and retrieve keys
  const org = await db.get(
    'SELECT id, name, public_key, private_key_encrypted, status FROM organizations WHERE id = ?',
    [org_id]
  );

  if (!org) {
    const err = new Error('Organization not found');
    err.status = 404;
    throw err;
  }

  if (org.status === 'suspended') {
    const err = new Error('Organization is suspended and cannot issue certificates');
    err.status = 403;
    throw err;
  }

  const certificateId = uuidv4();
  const fileHash = fileBuffer ? hashBuffer(fileBuffer) : null;

  // 1. Calculate canonical SHA-256 payload hash
  const payloadHash = hashCertificatePayload({
    id: certificateId,
    org_id,
    recipient_name,
    title,
    issue_date,
    file_hash: fileHash
  });

  // 2. Decrypt org private key in-memory
  const privateKeyPem = decryptKey(org.private_key_encrypted);

  // 3. Digitally sign the hash with ECDSA P-256
  const signature = signHash(payloadHash, privateKeyPem);

  // 4. Verification URL
  const qrCodeUrl = `/verify/${certificateId}`;

  // 5. Store certificate in DB
  await db.run(
    `INSERT INTO certificates (id, org_id, recipient_name, title, issue_date, file_hash, signature, status, qr_code_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, datetime('now'))`,
    [certificateId, org_id, recipient_name.trim(), title.trim(), issue_date, fileHash, signature, qrCodeUrl]
  );

  // 6. Record audit log
  await logAudit({
    actor_id,
    action: 'certificate.created',
    target_id: certificateId,
    metadata: {
      org_id,
      recipient_name,
      title,
      payload_hash: payloadHash
    }
  });

  return {
    id: certificateId,
    org_id,
    org_name: org.name,
    recipient_name: recipient_name.trim(),
    title: title.trim(),
    issue_date,
    file_hash: fileHash,
    payload_hash: payloadHash,
    signature,
    status: 'active',
    qr_code_url: qrCodeUrl,
    created_at: new Date().toISOString()
  };
}

module.exports = {
  issueCertificate
};
