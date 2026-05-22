const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/server');

let orgToken = '';
let orgId = '';
let certificateId = '';

test('API: Health check returns 200 online', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'online');
});

test('API: Register new Organization', async () => {
  const email = `university_${Date.now()}@edu.test`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      org_name: 'Stanford Institute of Technology',
      email,
      password: 'SecurePassword123!',
      admin_name: 'Dean Alice Walker'
    });

  assert.strictEqual(res.status, 201);
  assert.ok(res.body.token);
  assert.strictEqual(res.body.user.role, 'org_admin');
  
  orgToken = res.body.token;
  orgId = res.body.user.org_id;
});

test('API: Issue a new Certificate', async () => {
  const res = await request(app)
    .post('/api/certificates')
    .set('Authorization', `Bearer ${orgToken}`)
    .send({
      recipient_name: 'Robert Oppenheimer',
      title: 'Ph.D. in Theoretical Physics',
      issue_date: '2026-09-12'
    });

  assert.strictEqual(res.status, 201);
  assert.ok(res.body.certificate.id);
  assert.strictEqual(res.body.certificate.status, 'active');
  assert.ok(res.body.certificate.signature);
  
  certificateId = res.body.certificate.id;
});

test('API: Public verification of issued certificate returns "valid"', async () => {
  const res = await request(app).get(`/api/verify/${certificateId}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.result, 'valid');
  assert.strictEqual(res.body.security_details.signature_valid, true);
  assert.strictEqual(res.body.certificate.recipient_name, 'Robert Oppenheimer');
});

test('API: Public verification of non-existent ID returns 404 "not_found"', async () => {
  const res = await request(app).get('/api/verify/non-existent-uuid-000');
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.result, 'not_found');
});

test('API: Revoke Certificate returns 200 and changes status', async () => {
  const res = await request(app)
    .patch(`/api/certificates/${certificateId}/revoke`)
    .set('Authorization', `Bearer ${orgToken}`)
    .send({
      reason: 'Administrative academic audit: credential re-issued under updated accreditation standards'
    });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.revocation.certificate_id, certificateId);
});

test('API: Re-verifying revoked certificate returns "revoked"', async () => {
  const res = await request(app).get(`/api/verify/${certificateId}`);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.result, 'revoked');
  assert.ok(res.body.revocation.reason.includes('Administrative academic audit'));
});
