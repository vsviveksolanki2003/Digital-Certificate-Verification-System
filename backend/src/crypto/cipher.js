const crypto = require('crypto');
const config = require('../config/env');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard 96 bits for GCM
const KEY_BUFFER = crypto.scryptSync(config.encryptionMasterKey, 'vault-salt-salt', 32);

/**
 * Encrypts plaintext (e.g. private key PEM) using AES-256-GCM
 * @param {string} text - Plaintext to encrypt
 * @returns {string} - Serialized format: iv:authTag:ciphertext (hex)
 */
function encryptKey(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_BUFFER, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts encrypted text back to plaintext in-memory
 * @param {string} encryptedPayload - iv:authTag:ciphertext
 * @returns {string} - Decrypted plaintext
 */
function decryptKey(encryptedPayload) {
  const parts = encryptedPayload.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted payload format');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY_BUFFER, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

module.exports = {
  encryptKey,
  decryptKey
};
