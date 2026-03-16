import React, { useEffect, useState } from 'react';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 150);   // content animates in
    const t2 = setTimeout(() => setPhase(2), 2500);  // start fade out
    const t3 = setTimeout(() => {
      sessionStorage.setItem('piki_splashed', '1');
      if (onDone) onDone();  // called AFTER fade is fully complete
    }, 3200);    // 2500 + 700ms = fade fully done before unmount
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;800&display=swap" rel="stylesheet" />

      <div style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'linear-gradient(180deg, #0A1628 0%, #0B1E32 55%, #081820 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        // Fade to transparent — the page behind is SAME dark colour so no flash
        opacity: phase === 2 ? 0 : 1,
        transition: 'opacity 0.7s ease',
        // pointer-events off once fading so user can interact with page behind
        pointerEvents: phase === 2 ? 'none' : 'all',
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}>

        {/* Radial glow */}
        <div style={{
          position: 'absolute', width: 380, height: 380, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,214,143,0.11) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}/>

        {/* APP ICON */}
        <div style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.65) translateY(28px)',
          transition: 'all 0.6s cubic-bezier(0.34, 1.45, 0.64, 1)',
          marginBottom: 40,
        }}>
          <div style={{
            width: 130, height: 130, borderRadius: 30,
            background: '#00D68F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 50px rgba(0,214,143,0.38), 0 2px 16px rgba(0,0,0,0.5)',
          }}>
            <img
              src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f3cd_fe0f/emoji.svg"
              alt="motorbike"
              style={{ width: 78, height: 78, display: 'block' }}
              onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }}
            />
            <span style={{ fontSize: 60, display: 'none', lineHeight: 1 }}>🏍️</span>
          </div>
        </div>

        {/* PIKISHIELD */}
        <div style={{
          fontSize: 46, fontWeight: 800, letterSpacing: '-0.5px', color: '#00D68F',
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'translateY(0)' : 'translateY(12px)',
          transition: 'all 0.55s ease 0.12s', marginBottom: 10,
        }}>PikiShield</div>

        {/* MICRO-PROTECTION */}
        <div style={{
          fontSize: 12, fontWeight: 400, letterSpacing: '5px',
          color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.55s ease 0.20s', marginBottom: 22,
        }}>Micro-Protection</div>

        {/* Tagline */}
        <div style={{
          fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,0.28)',
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'translateY(0)' : 'translateY(8px)',
          transition: 'all 0.55s ease 0.28s',
        }}>Protecting every ride, every day</div>

        {/* Progress bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(0,214,143,0.15)' }}>
          <div style={{
            height: '100%', background: '#00D68F',
            width: phase === 2 ? '100%' : phase === 1 ? '75%' : '5%',
            transition: phase === 1 ? 'width 2.2s ease' : 'width 0.5s ease',
            boxShadow: '0 0 14px rgba(0,214,143,0.9)',
          }}/>
        </div>
      </div>
    </>
  );
}
