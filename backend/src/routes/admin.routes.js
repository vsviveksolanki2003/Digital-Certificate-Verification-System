const express = require('express');
const db = require('../db/connection');
const { authenticate, requireRole } = require('../middleware/auth');
const { logAudit, getAuditLogs } = require('../services/audit.service');

const router = express.Router();

// Guard all admin routes with authentication and super_admin role
router.use(authenticate, requireRole('super_admin'));

/**
 * GET /api/admin/stats
 * Global platform overview
 */
router.get('/stats', async (req, res, next) => {
  try {
    const orgsCount = await db.get("SELECT COUNT(*) as count, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active FROM organizations");
    const certsCount = await db.get("SELECT COUNT(*) as count, SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active, SUM(CASE WHEN status='revoked' THEN 1 ELSE 0 END) as revoked FROM certificates");
    const verificationsCount = await db.get("SELECT COUNT(*) as count, SUM(CASE WHEN result='valid' THEN 1 ELSE 0 END) as valid, SUM(CASE WHEN result='invalid' THEN 1 ELSE 0 END) as invalid, SUM(CASE WHEN result='revoked' THEN 1 ELSE 0 END) as revoked FROM verification_logs");

    res.status(200).json({
      stats: {
        organizations: {
          total: orgsCount ? orgsCount.count : 0,
          active: orgsCount ? (orgsCount.active || 0) : 0
        },
        certificates: {
          total: certsCount ? certsCount.count : 0,
          active: certsCount ? (certsCount.active || 0) : 0,
          revoked: certsCount ? (certsCount.revoked || 0) : 0
        },
        verifications: {
          total: verificationsCount ? verificationsCount.count : 0,
          valid: verificationsCount ? (verificationsCount.valid || 0) : 0,
          invalid: verificationsCount ? (verificationsCount.invalid || 0) : 0,
          revoked: verificationsCount ? (verificationsCount.revoked || 0) : 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/organizations
 * List all registered organizations
 */
router.get('/organizations', async (req, res, next) => {
  try {
    const { status, search } = req.query;

    let query = `
      SELECT o.id, o.name, o.email, o.status, o.created_at,
             COUNT(c.id) as total_certificates,
             SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) as active_certificates,
             SUM(CASE WHEN c.status = 'revoked' THEN 1 ELSE 0 END) as revoked_certificates
      FROM organizations o
      LEFT JOIN certificates c ON o.id = c.org_id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (o.name LIKE ? OR o.email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' GROUP BY o.id ORDER BY o.created_at DESC';

    const orgs = await db.query(query, params);

    res.status(200).json({
      organizations: orgs
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/admin/organizations/:id/status
 * Suspend or reactivate an organization
 */
router.patch('/organizations/:id/status', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Status must be either "active" or "suspended"'
      });
    }

    const org = await db.get('SELECT id, name FROM organizations WHERE id = ?', [id]);
    if (!org) {
      return res.status(404).json({
        error: 'NotFound',
        message: 'Organization not found'
      });
    }

    await db.run('UPDATE organizations SET status = ? WHERE id = ?', [status, id]);

    await logAudit({
      actor_id: req.user.id,
      action: `organization.${status}`,
      target_id: id,
      metadata: { org_name: org.name, new_status: status }
    });

    res.status(200).json({
      message: `Organization status updated to ${status}`,
      organization: {
        id,
        name: org.name,
        status
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/audit-logs
 * Platform-wide immutable audit trail
 */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { limit = 100, offset = 0, actor_id, action } = req.query;
    const logs = await getAuditLogs({
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10),
      actor_id,
      action
    });

    const totalCount = await db.get('SELECT COUNT(*) as count FROM audit_logs');

    res.status(200).json({
      logs,
      total: totalCount ? totalCount.count : 0
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
