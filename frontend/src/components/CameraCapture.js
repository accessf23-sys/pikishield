import React, { useState, useRef, useEffect, useCallback } from 'react';

/**
 * CameraCapture — works on desktop (webcam via getUserMedia) AND mobile (native camera).
 * On mobile: tapping "📷 Take Photo" uses the native camera app via <input capture>.
 * On desktop: opens a webcam modal with live preview + snap button.
 *
 * Props:
 *   onCapture(file)  — called with a File object (JPEG) when photo is taken
 *   disabled         — disables the button
 *   color            — button background color (default green)
 *   label            — button label (default "📷 Camera")
 */
export default function CameraCapture({ onCapture, disabled, color = '#059669', label = '📷 Camera' }) {
  const [open, setOpen]       = useState(false);
  const [stream, setStream]   = useState(null);
  const [error, setError]     = useState('');
  const [snapped, setSnapped] = useState(null); // base64 preview after snap
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const mobileRef = useRef(null);

  // Detect mobile/tablet
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  const startCamera = useCallback(async () => {
    setError(''); setSnapped(null);
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
    } catch(e) {
      if (e.name === 'NotAllowedError') setError('Camera access denied. Please allow camera in your browser settings.');
      else if (e.name === 'NotFoundError') setError('No camera found on this device.');
      else setError('Could not open camera: ' + e.message);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) { stream.getTracks().forEach(t => t.stop()); setStream(null); }
  }, [stream]);

  const handleOpen = () => {
    if (isMobile) {
      // On mobile: just trigger native camera input
      mobileRef.current?.click();
      return;
    }
    setOpen(true);
  };

  useEffect(() => {
    if (open && !isMobile) startCamera();
    return () => { if (!open) stopCamera(); };
  }, [open]);

  const handleClose = () => { stopCamera(); setOpen(false); setSnapped(null); setError(''); };

  const snap = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setSnapped(canvas.toDataURL('image/jpeg', 0.92));
      stopCamera();
      // store file for confirm step
      canvasRef.current._capturedFile = file;
    }, 'image/jpeg', 0.92);
  };

  const confirmPhoto = () => {
    const file = canvasRef.current?._capturedFile;
    if (file) { onCapture(file); handleClose(); }
  };

  const retake = () => { setSnapped(null); startCamera(); };

  // Mobile file input handler
  const handleMobileFile = (e) => {
    const f = e.target.files[0];
    if (f) onCapture(f);
    e.target.value = '';
  };

  return (
    <>
      {/* Hidden mobile input */}
      <input ref={mobileRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handleMobileFile} />

      {/* Camera button */}
      <button type="button" disabled={disabled} onClick={handleOpen}
        style={{ padding: '5px 10px', borderRadius: 6, border: 'none',
          background: disabled ? '#D1D5DB' : color, color: 'white',
          fontSize: 11, fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap', opacity: disabled ? .6 : 1 }}>
        {label}
      </button>

      {/* Desktop webcam modal */}
      {open && !isMobile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999,
          background: 'rgba(5,14,31,.85)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={handleClose}>
          <div style={{ background: '#1E293B', borderRadius: 16, overflow: 'hidden',
            width: '100%', maxWidth: 520, boxShadow: '0 32px 80px rgba(0,0,0,.6)' }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', background: '#0F172A' }}>
              <div style={{ color: 'white', fontWeight: 700, fontSize: 13 }}>📷 Take Photo</div>
              <button onClick={handleClose} style={{ background: 'rgba(255,255,255,.1)', border: 'none',
                borderRadius: 7, width: 28, height: 28, color: 'white', cursor: 'pointer', fontSize: 14 }}>✕</button>
            </div>

            {/* Camera view or preview */}
            <div style={{ position: 'relative', background: '#000', minHeight: 300 }}>
              {error ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#F87171' }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📷</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6 }}>{error}</div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 12 }}>
                    Allow camera access in your browser address bar, then try again.
                  </div>
                </div>
              ) : snapped ? (
                <img src={snapped} alt="Preview" style={{ width: '100%', display: 'block' }} />
              ) : (
                <video ref={videoRef} autoPlay playsInline muted
                  style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover' }} />
              )}
              {/* Invisible canvas for capture */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />
            </div>

            {/* Controls */}
            <div style={{ padding: '14px 16px', display: 'flex', gap: 10,
              justifyContent: 'center', background: '#0F172A' }}>
              {snapped ? (
                <>
                  <button onClick={retake}
                    style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #475569',
                      background: 'transparent', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                    🔄 Retake
                  </button>
                  <button onClick={confirmPhoto}
                    style={{ padding: '9px 24px', borderRadius: 8, border: 'none',
                      background: color, color: 'white', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
                    ✅ Use This Photo
                  </button>
                </>
              ) : !error ? (
                <button onClick={snap} disabled={!stream}
                  style={{ width: 64, height: 64, borderRadius: '50%', border: '4px solid white',
                    background: stream ? color : '#475569', cursor: stream ? 'pointer' : 'not-allowed',
                    fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: stream ? `0 0 20px ${color}88` : 'none', transition: 'all .2s' }}>
                  📸
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
