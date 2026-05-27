# Digital Certificate Verification System

> Institutional cryptographic document and certificate attestation platform powered by **ECDSA NIST P-256** digital signatures, **SHA-256** canonical payload hashing, **AES-256-GCM** key encryption at rest, and instant public QR verification.

Conforms strictly to the Product Requirements Document (PRD). Built **without Next.js** using a high-performance **Vite + React** single-page frontend and a modular **Node.js + Express** backend.

---

## Key Features

1. **Cryptographic Integrity & Tamper Evidence**
   - Organization keypairs generated using **ECDSA NIST P-256 (prime256v1)**.
   - Private keys encrypted at rest using **AES-256-GCM** with unique 96-bit initialization vectors and authentication tags.
   - Deterministic, canonical **SHA-256** hashing of certificate metadata and optional binary document assets.
   - Any modification to recipient name, title, or date immediately breaks the mathematical signature, triggering **Invalid (Tampered)**.

2. **Instant Public Verification (No Login Required)**
   - Verification endpoint `/verify/:id` accessible via direct UUID lookup or camera QR scanner.
   - Returns instant cryptographic status: **Valid (Authentic)**, **Revoked**, **Invalid (Tampered)**, or **Not Found**.
   - Optional byte-level SHA-256 document file comparison.
   - Rate-limited to prevent automated scraping (20-30 requests/minute per IP).

3. **Issuing Organization Workspace**
   - Register organization with automated keypair provisioning.
   - Role-Based Access Control: `Super Admin`, `Org Admin`, `Org Staff`.
   - Issue certificates with real-time digital signing.
   - Permanent certificate revocation with mandatory justification logging.
   - Vector PDF certificate generator with embedded QR code, cryptographic seals, and public verification fingerprints.

4. **Super Admin & Immutable Audit Ledger**
   - Platform-wide supervision across organizations (activation / suspension).
   - Append-only immutable audit logs for all administrative actions (`certificate.created`, `certificate.revoked`, `organization.suspended`, etc.).
   - Global verification metrics and fraud attempt signals.

5. **Interactive Tamper Demo Lab**
   - Built-in simulation tool to alter certificate data in the database and immediately observe the ECDSA signature mismatch in real-time.

---

## Technology Stack

- **Frontend:** React (Vite SPA), Vanilla CSS Design System (Custom Dark Vault Theme), `qrcode.react`, `html5-qrcode`, `canvas-confetti`. **(No Next.js)**
- **Backend:** Node.js + Express, `crypto` (built-in NIST P-256 & AES-256-GCM), `jsonwebtoken`, `bcryptjs`, `pdfkit`, `qrcode`, `express-rate-limit`, `multer`.
- **Database:** Dual-mode connection manager:
  - Default: Native high-performance **SQLite (`node:sqlite`)** for instant zero-config execution.
  - Production: **Neon Serverless PostgreSQL (`pg`)** automatically engaged when `DATABASE_URL` is configured in `.env`.

---

## Quick Start & Installation

### 1. Install Dependencies
```bash
# Install root, backend, and frontend packages
npm run install:all
```

### 2. Seed Demo Data
Pre-populates an Issuing Organization (MIT Center for Cryptographic Research), Super Admin, active certificates, revoked credentials, and verification logs:
```bash
npm run seed
```

### 3. Run Development Servers
```bash
# Concurrently launches backend (port 5001) and frontend (port 5173)
npm run dev
```
Or start individually:
```bash
npm run dev:backend   # Express API server at http://localhost:5001
npm run dev:frontend  # Vite React App at http://localhost:5173
```

---

## Default Demo Credentials

| Role | Email | Password |
|---|---|---|
| **Super Admin** | `admin@vault.veritas.gov` | `AdminSecret2026!` |
| **MIT Org Admin** | `alice@mit-crypto.edu` | `MitSecure2026!` |
| **MIT Org Staff** | `bob@mit-crypto.edu` | `StaffSecure2026!` |

---

## Running Automated Tests

```bash
npm test
```
Executes automated test suites:
- **`backend/tests/crypto.test.js`**: Keypair generation, AES-256-GCM encryption/decryption, canonical SHA-256 hashing, and ECDSA signature verification.
- **`backend/tests/api.test.js`**: Full lifecycle test (organization registration, certificate issuance, public verification, revocation, and re-verification).

---

## PRD Demo Walkthrough Script

1. **Public Verification**:
   - Open `http://localhost:5173/` (Verify Document).
   - Enter active certificate UUID: `b6e14e6b-9d22-4b65-a913-0640110318c0` (Alan Turing).
   - Observe the green **AUTHENTIC & VERIFIED** status, ECDSA P-256 signature proof, and download the official PDF certificate.
2. **Revocation Verification**:
   - Enter revoked certificate UUID: `2c4abff8-bea9-4559-be9e-456c632ad495` (Victor Lustig).
   - Observe the amber **REVOKED CREDENTIAL** badge and official revocation justification.
3. **Tamper & Forgery Demonstration**:
   - Navigate to **Tamper Demo Lab**.
   - Select an authentic certificate and click **Simulate Forgery**.
   - Click **Verify Tampered Certificate Now**.
   - Observe the red **SIGNATURE MISMATCH / TAMPERED** alert triggered because the altered recipient cannot match the cryptographic signature.
   - Click **Restore** to return to the authentic state.
4. **Org Workspace & Issuance**:
   - Sign in as `alice@mit-crypto.edu` (`MitSecure2026!`).
   - Click **Issue New Certificate**, enter recipient details, and download the generated PDF.
5. **Super Admin Governance**:
   - Sign in as `admin@vault.veritas.gov` (`AdminSecret2026!`).
   - View registered organizations, suspend/activate accounts, and inspect the platform-wide audit log.
