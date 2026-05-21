const PDFDocument = require('pdfkit');
const { generateQrBuffer } = require('./qr.service');
const { hashBuffer } = require('../crypto/hasher');

/**
 * Generates an institutional-grade PDF certificate with embedded QR code and cryptographic fingerprint
 * @param {Object} cert - Certificate database record with org_name and org_public_key
 * @returns {Promise<Buffer>} - Resolves with the complete PDF buffer
 */
async function generateCertificatePdf(cert) {
  return new Promise(async (resolve, reject) => {
    try {
      // Landscape A4 certificate (841.89 x 595.28 pt)
      const doc = new PDFDocument({
        layout: 'landscape',
        size: 'A4',
        margins: { top: 40, bottom: 40, left: 40, right: 40 }
      });

      const buffers = [];
      doc.on('data', chunk => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const width = doc.page.width;
      const height = doc.page.height;

      // 1. Dark vault outer background and elegant double borders
      doc.rect(0, 0, width, height).fill('#0B0F17');

      // Inner card
      doc.roundedRect(20, 20, width - 40, height - 40, 8)
         .lineWidth(1.5)
         .strokeColor('#1E293B')
         .fillAndStroke('#0F172A', '#1E293B');

      // Accent border
      doc.roundedRect(28, 28, width - 56, height - 56, 6)
         .lineWidth(1)
         .strokeColor('#334155')
         .stroke();

      // Mint accent line at top
      doc.rect(30, 30, width - 60, 4).fill('#00E599');

      // 2. Issuing Organization Banner
      doc.fillColor('#94A3B8')
         .fontSize(11)
         .text(cert.org_name.toUpperCase(), 0, 55, { align: 'center', characterSpacing: 2 });

      doc.fillColor('#F8FAFC')
         .fontSize(22)
         .text('DIGITAL CERTIFICATE OF ATTESTATION', 0, 75, { align: 'center', characterSpacing: 1.5 });

      doc.fillColor('#64748B')
         .fontSize(10)
         .text('CRYPTOGRAPHICALLY SECURED VIA ECDSA-P256 & SHA-256', 0, 105, { align: 'center', characterSpacing: 1 });

      // 3. Recipient Section
      doc.fillColor('#94A3B8')
         .fontSize(11)
         .text('THIS ACCREDITATION IS PROUDLY CONFERRED UPON', 0, 140, { align: 'center', characterSpacing: 1 });

      doc.fillColor('#38BDF8')
         .fontSize(30)
         .text(cert.recipient_name, 0, 165, { align: 'center' });

      // Decorative divider
      const lineY = 210;
      doc.moveTo(width / 2 - 120, lineY).lineTo(width / 2 + 120, lineY).lineWidth(1).strokeColor('#334155').stroke();

      // 4. Achievement Description
      doc.fillColor('#E2E8F0')
         .fontSize(12)
         .text('IN RECOGNITION OF EXEMPLARY COMPLETION AND FULFILLMENT OF ALL REQUIREMENTS FOR', 0, 225, { align: 'center' });

      doc.fillColor('#00E599')
         .fontSize(20)
         .text(cert.title, 0, 248, { align: 'center', characterSpacing: 0.5 });

      doc.fillColor('#94A3B8')
         .fontSize(11)
         .text(`DATE OF ISSUANCE: ${cert.issue_date}`, 0, 285, { align: 'center' });

      // 5. Bottom Section: QR Code & Cryptographic Verification Specs
      const qrBuffer = await generateQrBuffer(cert.id);
      const qrSize = 130;
      const qrX = 55;
      const qrY = height - 190;

      // QR container box
      doc.roundedRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 6)
         .fillColor('#FFFFFF')
         .fill();
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // Security Details beside QR code
      const detailsX = qrX + qrSize + 30;
      const detailsY = height - 190;

      doc.fillColor('#00E599')
         .fontSize(10)
         .text('CRYPTOGRAPHIC AUDIT SPECIFICATIONS', detailsX, detailsY, { characterSpacing: 1 });

      doc.fillColor('#94A3B8')
         .fontSize(8)
         .text(`CERTIFICATE UUID:`, detailsX, detailsY + 20)
         .fillColor('#F1F5F9')
         .text(cert.id, detailsX + 95, detailsY + 20);

      doc.fillColor('#94A3B8')
         .fontSize(8)
         .text(`STATUS:`, detailsX, detailsY + 36)
         .fillColor(cert.status === 'active' ? '#10B981' : '#EF4444')
         .text(cert.status.toUpperCase(), detailsX + 95, detailsY + 36);

      const pubKeyFingerprint = cert.org_public_key ? hashBuffer(cert.org_public_key).substring(0, 32) : 'REGISTERED_ISSUER';
      doc.fillColor('#94A3B8')
         .fontSize(8)
         .text(`ISSUER KEY FP:`, detailsX, detailsY + 52)
         .fillColor('#93C5FD')
         .text(pubKeyFingerprint, detailsX + 95, detailsY + 52);

      const sigSnippet = cert.signature ? `${cert.signature.substring(0, 38)}...` : 'N/A';
      doc.fillColor('#94A3B8')
         .fontSize(8)
         .text(`ECDSA SIGNATURE:`, detailsX, detailsY + 68)
         .fillColor('#CBD5E1')
         .text(sigSnippet, detailsX + 95, detailsY + 68);

      if (cert.file_hash) {
        doc.fillColor('#94A3B8')
           .fontSize(8)
           .text(`DOC SHA-256:`, detailsX, detailsY + 84)
           .fillColor('#FDE047')
           .text(cert.file_hash.substring(0, 38) + '...', detailsX + 95, detailsY + 84);
      }

      doc.fillColor('#64748B')
         .fontSize(8)
         .text('Scan the QR code or navigate to the verification portal to authenticate this document against the cryptographic registry.', detailsX, detailsY + 104, { width: 380 });

      // Official Seal Badge on right
      const sealX = width - 150;
      const sealY = height - 125;
      doc.circle(sealX, sealY, 40).lineWidth(2).strokeColor('#00E599').stroke();
      doc.circle(sealX, sealY, 36).lineWidth(1).strokeColor('#334155').stroke();
      doc.fillColor('#00E599')
         .fontSize(8)
         .text('AUTHENTIC', sealX - 25, sealY - 10, { width: 50, align: 'center' })
         .fillColor('#F8FAFC')
         .text('VERIFIED', sealX - 25, sealY + 2, { width: 50, align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  generateCertificatePdf
};
