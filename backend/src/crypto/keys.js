const crypto = require('crypto');

/**
 * Generates an ECDSA keypair using the standard NIST P-256 (prime256v1) curve.
 * Returns public and private keys in standard PEM format.
 */
function generateOrgKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  return {
    publicKey,
    privateKey
  };
}

module.exports = {
  generateOrgKeyPair
};
