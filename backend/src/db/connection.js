const fs = require('fs');
const path = require('path');
const config = require('../config/env');

let dbClient = null;
let isPostgres = false;

// Initialize Database connection
function initDatabase() {
  if (config.databaseUrl && config.databaseUrl.startsWith('postgres')) {
    const { Pool } = require('pg');
    isPostgres = true;
    dbClient = new Pool({
      connectionString: config.databaseUrl,
      ssl: config.databaseUrl.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined
    });
    console.log('[Database] Connected to PostgreSQL (Neon)');
  } else {
    const { DatabaseSync } = require('node:sqlite');
    isPostgres = false;
    const dataDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'cert_vault.sqlite');
    dbClient = new DatabaseSync(dbPath);
    // Enable WAL mode & foreign keys for performance and data integrity
    dbClient.exec('PRAGMA journal_mode = WAL;');
    dbClient.exec('PRAGMA foreign_keys = ON;');
    console.log(`[Database] Connected to SQLite: ${dbPath}`);
  }

  // Run schema DDL
  const schemaPath = path.resolve(__dirname, 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  
  if (isPostgres) {
    // Execute schema in Postgres pool
    dbClient.query(schemaSql).catch(err => {
      console.error('[Database] Error executing schema on Postgres:', err);
    });
  } else {
    // Execute schema in SQLite
    dbClient.exec(schemaSql);
  }
}

// Convert SQLite '?' placeholder to Postgres '$1, $2, ...'
function formatQuery(sql) {
  if (!isPostgres) return sql;
  let paramIndex = 1;
  return sql.replace(/\?/g, () => `$${paramIndex++}`);
}

// Unified query methods
async function query(sql, params = []) {
  if (!dbClient) initDatabase();
  
  if (isPostgres) {
    const res = await dbClient.query(formatQuery(sql), params);
    return res.rows;
  } else {
    const stmt = dbClient.prepare(sql);
    const result = stmt.all(...params);
    return result;
  }
}

async function get(sql, params = []) {
  if (!dbClient) initDatabase();

  if (isPostgres) {
    const res = await dbClient.query(formatQuery(sql), params);
    return res.rows[0] || null;
  } else {
    const stmt = dbClient.prepare(sql);
    const result = stmt.get(...params);
    return result || null;
  }
}

async function run(sql, params = []) {
  if (!dbClient) initDatabase();

  if (isPostgres) {
    const res = await dbClient.query(formatQuery(sql), params);
    return { changes: res.rowCount };
  } else {
    const stmt = dbClient.prepare(sql);
    const info = stmt.run(...params);
    return { changes: info.changes, lastInsertRowid: info.lastInsertRowid };
  }
}

async function exec(sql) {
  if (!dbClient) initDatabase();

  if (isPostgres) {
    return await dbClient.query(sql);
  } else {
    return dbClient.exec(sql);
  }
}

module.exports = {
  initDatabase,
  query,
  get,
  run,
  exec,
  isPostgres: () => isPostgres
};
