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

/**
 * POST /api/auth/login
 * User & Organization login
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Email and password are required'
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check users table first
    const user = await db.get(
      `SELECT u.id, u.org_id, u.name, u.email, u.password_hash, u.role, o.name as org_name, o.status as org_status
       FROM users u
       LEFT JOIN organizations o ON u.org_id = o.id
       WHERE u.email = ?`,
      [cleanEmail]
    );

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Verify password
    const isMatch = await comparePassword(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }

    // Check if organization is suspended
    if (user.org_id && user.org_status === 'suspended') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Organization account has been suspended by administration'
      });
    }

    // Generate JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      org_id: user.org_id,
      org_name: user.org_name
    });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        org_id: user.org_id,
        org_name: user.org_name
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    let orgData = null;
    if (req.user.org_id) {
      orgData = await db.get(
        'SELECT id, name, email, public_key, status, created_at FROM organizations WHERE id = ?',
        [req.user.org_id]
      );
    }

    res.status(200).json({
      user: req.user,
      organization: orgData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/invite-staff
 * Org Admin adds staff to their organization
 */
router.post('/invite-staff', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'org_admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only Organization Admins can add staff members'
      });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Name, email, and password are required'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await db.get('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'User with this email already exists'
      });
    }

    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);

    await db.run(
      `INSERT INTO users (id, org_id, name, email, password_hash, role, created_at)
       VALUES (?, ?, ?, ?, ?, 'org_staff', datetime('now'))`,
      [userId, req.user.org_id, name.trim(), cleanEmail, hashedPassword]
    );

    await logAudit({
      actor_id: req.user.id,
      action: 'user.staff_invited',
      target_id: userId,
      metadata: { org_id: req.user.org_id, staff_email: cleanEmail }
    });

    res.status(201).json({
      message: 'Staff member added successfully',
      staff: {
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        role: 'org_staff'
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
