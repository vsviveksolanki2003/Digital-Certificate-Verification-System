const express = require('express');
const db = require('../db/connection');
const { logAudit } = require('../services/audit.service');

const router = express.Router();

// In-memory backup of tampered certificates for easy restore during demos
const originalCertificatesBackup = new Map();

/**
 * POST /api/demo/tamper/:id
 * Modifies a certificate record directly in DB to simulate document tampering for fraud demonstration
 */
router.post('/tamper/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tampered_name, tampered_title } = req.body;

    const cert = await db.get('SELECT * FROM certificates WHERE id = ?', [id]);
    if (!cert) {
      return res.status(404).json({ error: 'NotFound', message: 'Certificate not found' });
    }

    if (!originalCertificatesBackup.has(id)) {
      originalCertificatesBackup.set(id, { ...cert });
    }

    const newRecipient = tampered_name || `${cert.recipient_name} [ALTERED/FORGED]`;
    const newTitle = tampered_title || cert.title;

    await db.run(
      'UPDATE certificates SET recipient_name = ?, title = ? WHERE id = ?',
      [newRecipient, newTitle, id]
    );

    await logAudit({
      actor_id: 'DEMO_SIMULATOR',
      action: 'certificate.tampered_for_demo',
      target_id: id,
      metadata: { original_name: cert.recipient_name, forged_name: newRecipient }
    });

    res.status(200).json({
      message: 'Certificate data deliberately altered to simulate fraud',
      certificate_id: id,
      original: { recipient_name: cert.recipient_name, title: cert.title },
      tampered: { recipient_name: newRecipient, title: newTitle },
      instruction: 'Now verify this certificate on the verification page to watch the ECDSA cryptographic mismatch trigger "Invalid (tampered)".'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/demo/restore/:id
 * Restores a tampered certificate back to its authentic original state
 */
router.post('/restore/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const original = originalCertificatesBackup.get(id);

    if (!original) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'No original backup found for this certificate ID'
      });
    }

    await db.run(
      'UPDATE certificates SET recipient_name = ?, title = ?, file_hash = ? WHERE id = ?',
      [original.recipient_name, original.title, original.file_hash, id]
    );

    originalCertificatesBackup.delete(id);

    await logAudit({
      actor_id: 'DEMO_SIMULATOR',
      action: 'certificate.restored_from_demo',
      target_id: id,
      metadata: { restored_name: original.recipient_name }
    });

    res.status(200).json({
      message: 'Certificate successfully restored to authentic signed state',
      certificate: original
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
