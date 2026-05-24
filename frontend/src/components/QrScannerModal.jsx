import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { IconCamera, IconX, IconAlertTriangle } from './Icons';

export function QrScannerModal({ isOpen, onClose, onScanSuccess }) {
  const [errorMsg, setErrorMsg] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const stopCamera = async () => {
    if (scannerRef.current && isCameraActive) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        // ignore already stopped
      }
      scannerRef.current = null;
      setIsCameraActive(false);
    }
  };

  const startCamera = async () => {
    setErrorMsg('');
    try {
      const html5QrCode = new Html5Qrcode("qr-reader-target");
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          stopCamera();
          handleDecodedResult(decodedText);
        },
        () => {
          // ignore scan frame misses
        }
      );
      setIsCameraActive(true);
    } catch (err) {
      console.warn('Camera access unavailable:', err);
      setErrorMsg('Camera access was not granted or not available. You can also upload a QR code image directly below.');
      setIsCameraActive(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg('');

    try {
      const html5QrCode = new Html5Qrcode("qr-file-target");
      const decodedText = await html5QrCode.scanFile(file, true);
      handleDecodedResult(decodedText);
    } catch (err) {
      setErrorMsg('Could not detect a valid QR code in the uploaded image. Please ensure the QR is clear and well-lit.');
    }
  };

  const handleDecodedResult = (text) => {
    // If URL like /verify/uuid or https://.../verify/uuid, extract UUID
    let cleanId = text.trim();
    if (cleanId.includes('/verify/')) {
      const parts = cleanId.split('/verify/');
      cleanId = parts[parts.length - 1].split('?')[0].split('/')[0];
    }
    onScanSuccess(cleanId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(7, 10, 15, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 16
    }}>
      <div className="vault-card" style={{ maxWidth: 460, width: '100%', position: 'relative' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          <IconX size={20} />
        </button>

        <h3 style={{ fontSize: '1.25rem', marginBottom: 8, color: 'var(--text-primary)' }}>
          Scan Certificate QR Code
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          Point your device camera at the QR code, or upload an image file containing the certificate QR.
        </p>

        {errorMsg && (
          <div style={{
            background: 'var(--accent-revoked-bg)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: 'var(--accent-revoked)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.82rem',
            marginBottom: 16,
            display: 'flex',
            gap: 8,
            alignItems: 'center'
          }}>
            <IconAlertTriangle size={16} />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* Video stream container */}
        <div 
          id="qr-reader-target" 
          style={{ 
            width: '100%', 
            minHeight: isCameraActive ? 260 : 0, 
            borderRadius: 'var(--radius-sm)', 
            overflow: 'hidden',
            marginBottom: 16,
            background: isCameraActive ? '#000' : 'transparent'
          }}
        />

        <div id="qr-file-target" style={{ display: 'none' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!isCameraActive ? (
            <button className="btn btn-primary" onClick={startCamera}>
              <IconCamera size={18} />
              Open Live Camera Scanner
            </button>
          ) : (
            <button className="btn btn-secondary" onClick={stopCamera}>
              Stop Camera
            </button>
          )}

          <div style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0' }}>
            OR
          </div>

          <button
            className="btn btn-outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload QR Code Image
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}
