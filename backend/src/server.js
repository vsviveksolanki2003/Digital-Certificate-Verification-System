const express = require('express');
const cors = require('cors');
const config = require('./config/env');

const app = express();

// Middlewares
app.use(cors({
  origin: config.frontendUrl,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const authRoutes = require('./routes/auth.routes');
const certRoutes = require('./routes/cert.routes');
const verifyRoutes = require('./routes/verify.routes');
const adminRoutes = require('./routes/admin.routes');
const demoRoutes = require('./routes/demo.routes');
const db = require('./db/connection');

// Initialize database
db.initDatabase();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/certificates', certRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/demo', demoRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    system: 'Document & Certificate Verification Vault API',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('[API Error]:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'An unexpected server error occurred'
  });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`[Vault API] Server running on port ${config.port} in ${config.nodeEnv} mode`);
  });
}

module.exports = app;
