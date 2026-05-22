const express = require('express');
const multer = require('multer');
const { authenticate, requireRole } = require('../middleware/auth');
const { issueCertificate } = require('../services/cert.service');
const db = require('../db/connection');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

const router = express.Router();

/**
 * POST /api/certificates
 * Issue a new cryptographically signed certificate
 * Allowed roles: org_admin, org_staff
 */
router.post(
  '/',
  authenticate,
  requireRole('org_admin', 'org_staff'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      const { recipient_name, title, issue_date } = req.body;

      if (!recipient_name || !title || !issue_date) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Recipient name, title, and issue date are required'
        });
      }

      const fileBuffer = req.file ? req.file.buffer : null;

      const cert = await issueCertificate({
        org_id: req.user.org_id,
        actor_id: req.user.id,
        recipient_name,
        title,
        issue_date,
        fileBuffer
      });

      res.status(201).json({
        message: 'Certificate issued and cryptographically signed successfully',
        certificate: cert
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/certificates
 * List all certificates belonging to the user's organization
 */
router.get(
  '/',
  authenticate,
  requireRole('org_admin', 'org_staff'),
  async (req, res, next) => {
    try {
      const { status, search, limit = 50, offset = 0 } = req.query;

      let query = `
        SELECT c.*, o.name as org_name
        FROM certificates c
        JOIN organizations o ON c.org_id = o.id
        WHERE c.org_id = ?
      `;
      const params = [req.user.org_id];

      if (status && ['active', 'revoked'].includes(status)) {
        query += ' AND c.status = ?';
        params.push(status);
      }

      if (search) {
        query += ' AND (c.recipient_name LIKE ? OR c.title LIKE ? OR c.id LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term);
      }

      query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
      params.push(parseInt(limit, 10), parseInt(offset, 10));

      const certs = await db.query(query, params);

      // Get count totals
      const countResult = await db.get(
        "SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status = 'revoked' THEN 1 ELSE 0 END) as revoked FROM certificates WHERE org_id = ?",
        [req.user.org_id]
      );

      res.status(200).json({
        certificates: certs,
        pagination: {
          total: countResult.total || 0,
          active: countResult.active || 0,
          revoked: countResult.revoked || 0,
          limit: parseInt(limit, 10),
          offset: parseInt(offset, 10)
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/certificates/:id
 * Get detail of a specific certificate
 */
router.get(
  '/:id',
  authenticate,
  requireRole('org_admin', 'org_staff'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      const cert = await db.get(
        `SELECT c.*, o.name as org_name, o.public_key as org_public_key
         FROM certificates c
         JOIN organizations o ON c.org_id = o.id
         WHERE c.id = ? AND c.org_id = ?`,
        [id, req.user.org_id]
      );

      if (!cert) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Certificate not found in your organization'
        });
      }

      // Check if revoked
      let revocation = null;
      if (cert.status === 'revoked') {
        revocation = await db.get(
          `SELECT r.reason, r.revoked_at, u.name as revoked_by_name
           FROM revocations r
           JOIN users u ON r.revoked_by = u.id
           WHERE r.certificate_id = ?`,
          [id]
        );
      }

      const { generateQrDataUrl } = require('../services/qr.service');
      const qrDataUrl = await generateQrDataUrl(cert.id);

      // Verification stats
      const verifications = await db.get(
        'SELECT COUNT(*) as count FROM verification_logs WHERE certificate_id = ?',
        [id]
      );

      res.status(200).json({
        certificate: {
          ...cert,
          qr_code_image: qrDataUrl,
          revocation,
          verification_count: verifications ? verifications.count : 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/certificates/:id/history
 * Get verification history for a specific certificate
 */
router.get(
  '/:id/history',
  authenticate,
  requireRole('org_admin', 'org_staff'),
  async (req, res, next) => {
    try {
      const { id } = req.params;

      // Ensure certificate belongs to caller's org
      const cert = await db.get('SELECT id FROM certificates WHERE id = ? AND org_id = ?', [id, req.user.org_id]);
      if (!cert) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Certificate not found in your organization'
        });
      }

      const logs = await db.query(
        'SELECT * FROM verification_logs WHERE certificate_id = ? ORDER BY verified_at DESC LIMIT 100',
        [id]
      );

      res.status(200).json({
        certificate_id: id,
        history: logs
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/certificates/:id/revoke
 * Revoke a certificate with a specified reason
 * Allowed roles: org_admin only
 */
router.patch(
  '/:id/revoke',
  authenticate,
  requireRole('org_admin'),
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || !reason.trim()) {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Revocation reason is required'
        });
      }

      // Check certificate exists in caller's org
      const cert = await db.get(
        'SELECT id, status, recipient_name, title FROM certificates WHERE id = ? AND org_id = ?',
        [id, req.user.org_id]
      );

      if (!cert) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Certificate not found in your organization'
        });
      }

      if (cert.status === 'revoked') {
        return res.status(400).json({
          error: 'BadRequest',
          message: 'Certificate has already been revoked'
        });
      }

      const revocationId = require('uuid').v4();
      const revokedAt = new Date().toISOString();

      // 1. Update certificate status to revoked
      await db.run(
        "UPDATE certificates SET status = 'revoked' WHERE id = ?",
        [id]
      );

      // 2. Insert into revocations table
      await db.run(
        `INSERT INTO revocations (id, certificate_id, revoked_by, reason, revoked_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [revocationId, id, req.user.id, reason.trim()]
      );

      // 3. Log immutable audit trail
      const { logAudit } = require('../services/audit.service');
      await logAudit({
        actor_id: req.user.id,
        action: 'certificate.revoked',
        target_id: id,
        metadata: {
          org_id: req.user.org_id,
          recipient_name: cert.recipient_name,
          reason: reason.trim()
        }
      });

      res.status(200).json({
        message: 'Certificate revoked successfully',
        revocation: {
          id: revocationId,
          certificate_id: id,
          revoked_by: req.user.name,
          reason: reason.trim(),
          revoked_at: revokedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/certificates/:id/pdf
 * Generates and downloads the official PDF certificate with embedded QR code
 * Accessible publicly or by org members
 */
router.get('/:id/pdf', async (req, res, next) => {
  try {
    const { id } = req.params;

    const cert = await db.get(
      `SELECT c.*, o.name as org_name, o.public_key as org_public_key
       FROM certificates c
       JOIN organizations o ON c.org_id = o.id
       WHERE c.id = ?`,
      [id]
    );

    if (!cert) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Certificate not found'
      });
    }

    const { generateCertificatePdf } = require('../services/pdf.service');
    const pdfBuffer = await generateCertificatePdf(cert);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Certificate-${cert.recipient_name.replace(/\s+/g, '_')}-${cert.id.substring(0, 8)}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
