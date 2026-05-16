const crypto = require('crypto');

/**
 * Signs a SHA-256 hash using the organization's ECDSA private key.
 * @param {string} hashHex - 64-character hex hash string
 * @param {string} privateKeyPem - Decrypted PKCS#8 private key PEM
 * @returns {string} - Base64-encoded signature
 */
function signHash(hashHex, privateKeyPem) {
  const signer = crypto.createSign('sha256');
  signer.update(hashHex);
  signer.end();
  
  const signatureBuffer = signer.sign(privateKeyPem);
  return signatureBuffer.toString('base64');
}

/**
 * Verifies an ECDSA digital signature against the public key and the original hash.
 * @param {string} hashHex - 64-character hex hash string
 * @param {string} signatureBase64 - Base64-encoded signature
 * @param {string} publicKeyPem - Organization's public key PEM
 * @returns {boolean} - true if signature is valid and untampered, false otherwise
 */
function verifySignature(hashHex, signatureBase64, publicKeyPem) {
  try {
    const verifier = crypto.createVerify('sha256');
    verifier.update(hashHex);
    verifier.end();
    
    const signatureBuffer = Buffer.from(signatureBase64, 'base64');
    return verifier.verify(publicKeyPem, signatureBuffer);
  } catch (err) {
    console.error('[Crypto Verify Error]:', err.message);
    return false;
  }
}

module.exports = {
  signHash,
  verifySignature
};
