const express = require('express');
const multer = require('multer');
const { authenticate, requireRole } = require('../middleware/auth');
const { issueCertificate } = require('../services/cert.service');

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

module.exports = router;
