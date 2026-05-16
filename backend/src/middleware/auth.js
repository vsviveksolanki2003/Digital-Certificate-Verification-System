const { verifyToken } = require('../utils/auth.utils');
const db = require('../db/connection');

/**
 * Middleware to authenticate requests via Bearer JWT token
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication token is required'
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token is invalid or expired'
      });
    }

    // If user belongs to an organization, check if organization is active
    if (decoded.org_id) {
      const org = await db.get('SELECT id, name, status FROM organizations WHERE id = ?', [decoded.org_id]);
      if (!org) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Associated organization no longer exists'
        });
      }
      if (org.status === 'suspended') {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Organization account has been suspended by administration'
        });
      }
      decoded.org_name = org.name;
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware factory for Role-Based Access Control
 * @param  {...string} allowedRoles 
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole
};
