const fs = require('fs');
const path = require('path');
const config = require('../config/env');

let dbClient = null;
let isPostgres = false;

let initPromise = null;

// Initialize Database connection
async function initDatabase() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (config.databaseUrl && config.databaseUrl.startsWith('postgres')) {
      const { Pool } = require('pg');
      isPostgres = true;
      dbClient = new Pool({
        connectionString: config.databaseUrl,
        ssl: { rejectUnauthorized: false }
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
      await dbClient.query(schemaSql);
      console.log('[Database] Schema verified on PostgreSQL (Neon)');
    } else {
      dbClient.exec(schemaSql);
    }
  })();

  return initPromise;
}

// Convert SQLite syntax and '?' placeholder to Postgres
function formatQuery(sql) {
  if (!isPostgres) return sql;
  let formatted = sql;
  formatted = formatted.replace(/datetime\('now',\s*'-(\d+)\s*days?'\)/gi, "CURRENT_TIMESTAMP - INTERVAL '$1 days'");
  formatted = formatted.replace(/datetime\('now',\s*'-(\d+)\s*hours?'\)/gi, "CURRENT_TIMESTAMP - INTERVAL '$1 hours'");
  formatted = formatted.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
  let paramIndex = 1;
  return formatted.replace(/\?/g, () => `$${paramIndex++}`);
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
