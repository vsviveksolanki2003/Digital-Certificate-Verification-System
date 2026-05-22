const test = require('node:test');
const assert = require('node:assert');

const { generateOrgKeyPair } = require('../src/crypto/keys');
const { encryptKey, decryptKey } = require('../src/crypto/cipher');
const { hashBuffer, hashCertificatePayload } = require('../src/crypto/hasher');
const { signHash, verifySignature } = require('../src/crypto/signer');

test('Crypto: generates valid ECDSA P-256 keypair', () => {
  const { publicKey, privateKey } = generateOrgKeyPair();
  assert.ok(publicKey.includes('BEGIN PUBLIC KEY'));
  assert.ok(privateKey.includes('BEGIN PRIVATE KEY'));
});

test('Crypto: AES-256-GCM symmetric encryption roundtrip', () => {
  const secret = '-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQg';
  const encrypted = encryptKey(secret);
  assert.notStrictEqual(encrypted, secret);
  assert.strictEqual(encrypted.split(':').length, 3);
  
  const decrypted = decryptKey(encrypted);
  assert.strictEqual(decrypted, secret);
});

test('Crypto: Canonical SHA-256 payload hasher produces deterministic hash', () => {
  const p1 = {
    id: 'test-uuid-1',
    org_id: 'org-uuid-1',
    recipient_name: 'Jane Doe',
    title: 'Masters in AI',
    issue_date: '2026-09-12'
  };
  const h1 = hashCertificatePayload(p1);
  const h2 = hashCertificatePayload({ ...p1 }); // Identical
  assert.strictEqual(h1, h2);
  assert.strictEqual(h1.length, 64);
});

test('Crypto: ECDSA digital signature valid on untampered data and invalid on tampered data', () => {
  const { publicKey, privateKey } = generateOrgKeyPair();
  const payload = {
    id: 'cert-101',
    org_id: 'org-42',
    recipient_name: 'Grace Hopper',
    title: 'Computer Science pioneer',
    issue_date: '2026-09-12'
  };

  const hash = hashCertificatePayload(payload);
  const signature = signHash(hash, privateKey);

  // Authenticate valid
  const isValid = verifySignature(hash, signature, publicKey);
  assert.strictEqual(isValid, true);

  // Alter recipient name (tamper)
  const tamperedPayload = { ...payload, recipient_name: 'Mallory Hacker' };
  const tamperedHash = hashCertificatePayload(tamperedPayload);
  const isTamperedValid = verifySignature(tamperedHash, signature, publicKey);
  assert.strictEqual(isTamperedValid, false);
});
