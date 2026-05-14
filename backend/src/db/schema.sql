-- Organizations
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users (Super Admin, Org Admin, Org Staff)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'org_staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Certificates
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  title TEXT NOT NULL,
  issue_date TEXT NOT NULL,
  file_hash TEXT,
  signature TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  qr_code_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Revocations
CREATE TABLE IF NOT EXISTS revocations (
  id TEXT PRIMARY KEY,
  certificate_id TEXT NOT NULL,
  revoked_by TEXT NOT NULL,
  reason TEXT NOT NULL,
  revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE CASCADE,
  FOREIGN KEY (revoked_by) REFERENCES users(id)
);

-- Verification Logs
CREATE TABLE IF NOT EXISTS verification_logs (
  id TEXT PRIMARY KEY,
  certificate_id TEXT,
  result TEXT NOT NULL,
  verifier_ip TEXT,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (certificate_id) REFERENCES certificates(id) ON DELETE SET NULL
);

-- Audit Logs (Platform-wide, append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_id TEXT,
  metadata TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
