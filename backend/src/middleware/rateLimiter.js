const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for public verification endpoint (F13: 20 req/min per IP)
 */
const verifyRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TooManyRequests',
    message: 'Rate limit exceeded. Please try verifying again in a minute.'
  }
});

module.exports = {
  verifyRateLimiter
};
