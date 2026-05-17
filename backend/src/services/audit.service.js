const { v4: uuidv4 } = require('uuid');
const db = require('../db/connection');

/**
 * Appends an immutable audit log entry
 * @param {Object} params
 * @param {string} params.actor_id - ID of user or system actor
 * @param {string} params.action - e.g. 'organization.registered', 'certificate.created', etc.
 * @param {string} [params.target_id] - ID of affected entity
 * @param {Object} [params.metadata] - Extra context
 */
async function logAudit({ actor_id, action, target_id = null, metadata = {} }) {
  try {
    const id = uuidv4();
    const metadataStr = JSON.stringify(metadata);
    await db.run(
      `INSERT INTO audit_logs (id, actor_id, action, target_id, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [id, actor_id, action, target_id, metadataStr]
    );
  } catch (error) {
    console.error('[Audit Log Error]:', error.message);
  }
}

/**
 * Retrieves audit logs with optional filtering
 */
async function getAuditLogs({ limit = 50, offset = 0, actor_id = null, action = null } = {}) {
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params = [];

  if (actor_id) {
    query += ' AND actor_id = ?';
    params.push(actor_id);
  }

  if (action) {
    query += ' AND action = ?';
    params.push(action);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const logs = await db.query(query, params);
  return logs.map(l => ({
    ...l,
    metadata: typeof l.metadata === 'string' ? JSON.parse(l.metadata || '{}') : l.metadata
  }));
}

module.exports = {
  logAudit,
  getAuditLogs
};
