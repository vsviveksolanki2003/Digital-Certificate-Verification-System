const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');
const { hashPassword, comparePassword, generateToken } = require('../utils/auth.utils');
const { generateOrgKeyPair } = require('../crypto/keys');
const { encryptKey } = require('../crypto/cipher');
const { logAudit } = require('../services/audit.service');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new organization and default Org Admin
 */
router.post('/register', async (req, res, next) => {
  try {
    const { org_name, email, password, admin_name } = req.body;

    if (!org_name || !email || !password || !admin_name) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'All fields (org_name, email, password, admin_name) are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Password must be at least 6 characters long'
      });
    }

    // Check if email already in use
    const existingOrg = await db.get('SELECT id FROM organizations WHERE email = ?', [email.toLowerCase()]);
    const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);

    if (existingOrg || existingUser) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'An account with this email already exists'
      });
    }

    // Generate ECDSA KeyPair for organization
    const { publicKey, privateKey } = generateOrgKeyPair();
    // Encrypt private key with AES-256-GCM before saving to database
    const encryptedPrivateKey = encryptKey(privateKey);

    const orgId = uuidv4();
    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);

    // Save Organization
    await db.run(
      `INSERT INTO organizations (id, name, email, password_hash, public_key, private_key_encrypted, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now'))`,
      [orgId, org_name.trim(), email.toLowerCase().trim(), hashedPassword, publicKey, encryptedPrivateKey]
    );

    // Save Org Admin User
    await db.run(
      `INSERT INTO users (id, org_id, name, email, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, 'org_admin', datetime('now'))`,
      [userId, orgId, admin_name.trim(), email.toLowerCase().trim(), hashedPassword]
    );

    // Log audit trail
    await logAudit({
      actor_id: userId,
      action: 'organization.registered',
      target_id: orgId,
      metadata: { org_name, email }
    });

    // Generate JWT
    const token = generateToken({
      id: userId,
      email: email.toLowerCase().trim(),
      name: admin_name.trim(),
      role: 'org_admin',
      org_id: orgId,
      org_name: org_name.trim()
    });

    res.status(201).json({
      message: 'Organization registered successfully',
      token,
      user: {
        id: userId,
        name: admin_name.trim(),
        email: email.toLowerCase().trim(),
        role: 'org_admin',
        org_id: orgId,
        org_name: org_name.trim()
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
