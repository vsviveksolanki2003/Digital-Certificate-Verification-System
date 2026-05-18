const QRCode = require('qrcode');
const config = require('../config/env');

/**
 * Builds the full public verification URL for a certificate
 * @param {string} certificateId 
 * @returns {string}
 */
function getVerificationUrl(certificateId) {
  return `${config.frontendUrl}/verify/${certificateId}`;
}

/**
 * Generates a QR code as a Base64 Data URL (image/png)
 * @param {string} certificateId 
 * @returns {Promise<string>}
 */
async function generateQrDataUrl(certificateId) {
  const url = getVerificationUrl(certificateId);
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#0B0F17',
      light: '#FFFFFF'
    },
    width: 320
  });
}

/**
 * Generates a QR code as a raw PNG Buffer
 * @param {string} certificateId 
 * @returns {Promise<Buffer>}
 */
async function generateQrBuffer(certificateId) {
  const url = getVerificationUrl(certificateId);
  return QRCode.toBuffer(url, {
    errorCorrectionLevel: 'H',
    margin: 2,
    color: {
      dark: '#0B0F17',
      light: '#FFFFFF'
    },
    width: 300
  });
}

/**
 * Generates a QR code as an SVG string
 * @param {string} certificateId 
 * @returns {Promise<string>}
 */
async function generateQrSvg(certificateId) {
  const url = getVerificationUrl(certificateId);
  return QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2
  });
}

module.exports = {
  getVerificationUrl,
  generateQrDataUrl,
  generateQrBuffer,
  generateQrSvg
};
