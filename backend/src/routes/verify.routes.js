const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { verifyRateLimiter } = require('../middleware/rateLimiter');
const { hashCertificatePayload, hashBuffer } = require('../crypto/hasher');
const { verifySignature } = require('../crypto/signer');
const { logAudit } = require('../services/audit.service');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const router = express.Router();

// Apply rate limiter to all verification routes
router.use(verifyRateLimiter);

/**
 * Helper to record verification attempt
 */
async function logVerificationAttempt({ certificateId, result, ip }) {
  try {
    const logId = uuidv4();
    await db.run(
      `INSERT INTO verification_logs (id, certificate_id, result, verifier_ip, verified_at)
       VALUES (?, ?, ?, ?, datetime('now'))`,
      [logId, certificateId, result, ip || 'anonymous']
    );
  } catch (err) {
    console.error('[Verification Log Error]:', err.message);
  }
}

/**
 * GET /api/verify/:id
 * Public instant verification endpoint - no authentication required
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // 1. Look up certificate and issuing organization
    const cert = await db.get(
      `SELECT c.*, o.name as org_name, o.public_key as org_public_key, o.status as org_status
       FROM certificates c
       JOIN organizations o ON c.org_id = o.id
       WHERE c.id = ?`,
      [id]
    );

    if (!cert) {
      await logVerificationAttempt({ certificateId: null, result: 'not_found', ip: clientIp });
      return res.status(404).json({
        result: 'not_found',
        message: 'Certificate ID was not found in the official registry',
        certificate_id: id,
        verified_at: new Date().toISOString()
      });
    }

    // 2. Check if revoked
    if (cert.status === 'revoked') {
      const revocation = await db.get(
        `SELECT r.reason, r.revoked_at, u.name as revoked_by_name
         FROM revocations r
         JOIN users u ON r.revoked_by = u.id
         WHERE r.certificate_id = ?`,
        [id]
      );

      await logVerificationAttempt({ certificateId: id, result: 'revoked', ip: clientIp });

      return res.status(200).json({
        result: 'revoked',
        message: 'This certificate has been revoked by the issuing authority',
        certificate: {
          id: cert.id,
          recipient_name: cert.recipient_name,
          title: cert.title,
          issue_date: cert.issue_date,
          org_id: cert.org_id,
          org_name: cert.org_name,
          status: 'revoked',
          created_at: cert.created_at
        },
        revocation: revocation || { reason: 'Revoked by authority', revoked_at: cert.created_at },
        verified_at: new Date().toISOString()
      });
    }

    // 3. Re-compute canonical hash
    const expectedHash = hashCertificatePayload({
      id: cert.id,
      org_id: cert.org_id,
      recipient_name: cert.recipient_name,
      title: cert.title,
      issue_date: cert.issue_date,
      file_hash: cert.file_hash
    });

    // 4. Verify ECDSA signature against org public key
    const isSignatureAuthentic = verifySignature(expectedHash, cert.signature, cert.org_public_key);

    if (!isSignatureAuthentic) {
      await logVerificationAttempt({ certificateId: id, result: 'invalid', ip: clientIp });
      return res.status(200).json({
        result: 'invalid',
        message: 'Warning: Cryptographic signature mismatch. The certificate data has been altered or tampered with.',
        certificate: {
          id: cert.id,
          recipient_name: cert.recipient_name,
          title: cert.title,
          issue_date: cert.issue_date,
          org_id: cert.org_id,
          org_name: cert.org_name
        },
        security_details: {
          signature_valid: false,
          computed_hash: expectedHash
        },
        verified_at: new Date().toISOString()
      });
    }

    // 5. Valid and authentic!
    await logVerificationAttempt({ certificateId: id, result: 'valid', ip: clientIp });

    res.status(200).json({
      result: 'valid',
      message: 'Certificate is authentic, digitally signed, and active',
      certificate: {
        id: cert.id,
        recipient_name: cert.recipient_name,
        title: cert.title,
        issue_date: cert.issue_date,
        org_id: cert.org_id,
        org_name: cert.org_name,
        has_file: !!cert.file_hash,
        file_hash: cert.file_hash,
        status: 'active',
        created_at: cert.created_at
      },
      issuer: {
        name: cert.org_name,
        public_key_fingerprint: hashBuffer(cert.org_public_key).substring(0, 32),
        status: cert.org_status
      },
      security_details: {
        signature_algorithm: 'ECDSA-P256-SHA256',
        signature_valid: true,
        payload_hash: expectedHash
      },
      verified_at: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/verify/:id/compare-file
 * Verify certificate along with an uploaded file for SHA-256 integrity match
 */
router.post('/:id/compare-file', upload.single('file'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const clientIp = req.ip || req.socket.remoteAddress;

    if (!req.file) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Document file is required for comparison'
      });
    }

    const cert = await db.get(
      `SELECT c.*, o.name as org_name, o.public_key as org_public_key
       FROM certificates c
       JOIN organizations o ON c.org_id = o.id
       WHERE c.id = ?`,
      [id]
    );

    if (!cert) {
      return res.status(404).json({
        result: 'not_found',
        message: 'Certificate ID not found'
      });
    }

    const uploadedFileHash = hashBuffer(req.file.buffer);
    const fileHashMatch = cert.file_hash ? (cert.file_hash === uploadedFileHash) : false;

    // Check payload signature
    const expectedHash = hashCertificatePayload({
      id: cert.id,
      org_id: cert.org_id,
      recipient_name: cert.recipient_name,
      title: cert.title,
      issue_date: cert.issue_date,
      file_hash: cert.file_hash
    });

    const isSignatureAuthentic = verifySignature(expectedHash, cert.signature, cert.org_public_key);

    const overallValid = isSignatureAuthentic && fileHashMatch && cert.status === 'active';
    const resultStatus = !overallValid ? 'invalid' : 'valid';

    await logVerificationAttempt({ certificateId: id, result: resultStatus, ip: clientIp });

    res.status(200).json({
      result: resultStatus,
      certificate_status: cert.status,
      signature_valid: isSignatureAuthentic,
      file_match: fileHashMatch,
      uploaded_file_hash: uploadedFileHash,
      recorded_file_hash: cert.file_hash,
      message: fileHashMatch
        ? 'File SHA-256 fingerprint matches original issued document precisely'
        : 'File SHA-256 fingerprint mismatch! Uploaded file is different from the original issued document'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
