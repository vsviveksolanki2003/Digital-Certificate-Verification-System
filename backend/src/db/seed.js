const { v4: uuidv4 } = require('uuid');
const db = require('./connection');
const { hashPassword } = require('../utils/auth.utils');
const { generateOrgKeyPair } = require('../crypto/keys');
const { encryptKey } = require('../crypto/cipher');
const { issueCertificate } = require('../services/cert.service');
const { logAudit } = require('../services/audit.service');

async function seed() {
  console.log('[Seed] Starting database seed...');
  await db.initDatabase();

  // 1. Create Super Admin if not exists
  const superAdminEmail = 'admin@vault.veritas.gov';
  const existingSuperAdmin = await db.get('SELECT id FROM users WHERE email = ?', [superAdminEmail]);
  
  let superAdminId;
  if (!existingSuperAdmin) {
    superAdminId = uuidv4();
    const adminHash = await hashPassword('AdminSecret2026!');
    await db.run(
      `INSERT INTO users (id, org_id, name, email, password_hash, role, created_at)
       VALUES (?, NULL, 'Chief Security Inspector', ?, ?, 'super_admin', datetime('now'))`,
      [superAdminId, superAdminEmail, adminHash]
    );
    console.log('[Seed] Super Admin created: ' + superAdminEmail);
  } else {
    superAdminId = existingSuperAdmin.id;
  }

  // 2. Create Demo Organization: MIT Center for Cryptographic Research
  const orgEmail = 'registrar@mit-crypto.edu';
  let org = await db.get('SELECT id FROM organizations WHERE email = ?', [orgEmail]);
  let orgId;
  let adminUserId;

  if (!org) {
    orgId = uuidv4();
    adminUserId = uuidv4();
    const { publicKey, privateKey } = generateOrgKeyPair();
    const encryptedPrivateKey = encryptKey(privateKey);
    const orgPassword = await hashPassword('MitSecure2026!');

    await db.run(
      `INSERT INTO organizations (id, name, email, password_hash, public_key, private_key_encrypted, status, created_at)
       VALUES (?, 'MIT Center for Cryptographic Research', ?, ?, ?, ?, 'active', datetime('now'))`,
      [orgId, orgEmail, orgPassword, publicKey, encryptedPrivateKey]
    );

    // Create Org Admin User
    await db.run(
      `INSERT INTO users (id, org_id, name, email, password_hash, role, created_at)
       VALUES (?, ?, 'Dr. Alice Thorne (Dean)', 'alice@mit-crypto.edu', ?, 'org_admin', datetime('now'))`,
      [adminUserId, orgId, orgPassword]
    );

    // Create Org Staff User
    const staffId = uuidv4();
    const staffPassword = await hashPassword('StaffSecure2026!');
    await db.run(
      `INSERT INTO users (id, org_id, name, email, password_hash, role, created_at)
       VALUES (?, ?, 'Bob Martinez (Registrar Staff)', 'bob@mit-crypto.edu', ?, 'org_staff', datetime('now'))`,
      [staffId, orgId, staffPassword]
    );

    console.log('[Seed] MIT Organization & staff created.');

    // 3. Issue Demo Certificates
    // Cert 1: Alan Turing (Active)
    const cert1 = await issueCertificate({
      org_id: orgId,
      actor_id: adminUserId,
      recipient_name: 'Alan Turing',
      title: 'Ph.D. in Cryptanalysis & Machine Intelligence',
      issue_date: '2026-06-15'
    });
    console.log('[Seed] Issued active certificate 1:', cert1.id);

    // Cert 2: Katherine Johnson (Active)
    const cert2 = await issueCertificate({
      org_id: orgId,
      actor_id: adminUserId,
      recipient_name: 'Katherine Johnson',
      title: 'Distinction in Orbital Mechanics & Planetary Navigation',
      issue_date: '2026-08-20'
    });
    console.log('[Seed] Issued active certificate 2:', cert2.id);

    // Cert 3: Victor Lustig (To be Revoked)
    const cert3 = await issueCertificate({
      org_id: orgId,
      actor_id: adminUserId,
      recipient_name: 'Victor Lustig',
      title: 'Executive Certificate in International Financial Instruments',
      issue_date: '2025-11-10'
    });

    // Revoke Cert 3
    const revocationId = uuidv4();
    await db.run("UPDATE certificates SET status = 'revoked' WHERE id = ?", [cert3.id]);
    await db.run(
      `INSERT INTO revocations (id, certificate_id, revoked_by, reason, revoked_at)
       VALUES (?, ?, ?, 'Academic honor tribunal finding of fabricated coursework and fraudulent credentials', datetime('now'))`,
      [revocationId, cert3.id, adminUserId]
    );
    await logAudit({
      actor_id: adminUserId,
      action: 'certificate.revoked',
      target_id: cert3.id,
      metadata: { reason: 'Academic honor tribunal finding of fabricated coursework and fraudulent credentials' }
    });
    console.log('[Seed] Issued & revoked certificate 3:', cert3.id);

    // Add some verification logs for realistic history
    await db.run(
      `INSERT INTO verification_logs (id, certificate_id, result, verifier_ip, verified_at)
       VALUES (?, ?, 'valid', '192.168.1.45', datetime('now', '-2 days')),
              (?, ?, 'valid', '10.0.0.12', datetime('now', '-1 day')),
              (?, ?, 'revoked', '172.16.0.8', datetime('now', '-3 hours'))`,
      [uuidv4(), cert1.id, uuidv4(), cert2.id, uuidv4(), cert3.id]
    );

    console.log('[Seed] Pre-populated verification history.');
  } else {
    console.log('[Seed] Organization already exists.');
  }

  console.log('[Seed] Seed completed successfully!');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Seed Error]:', err);
      process.exit(1);
    });
}

module.exports = seed;
