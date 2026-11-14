import React, { useEffect, useState } from 'react';
import { LOGO_MARK } from './logoAssets';

// Splash: PikiShield yellow with the helmet mark. The mark image is the same yellow, so it blends in.
export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 150);
    const t2 = setTimeout(() => setPhase(2), 1200);   // start fade out
    const t3 = setTimeout(() => {
      sessionStorage.setItem('piki_splashed', '1');
      if (onDone) onDone();
    }, 1800);                                          // after the fade completes
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, background: '#FDC703',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: phase === 2 ? 0 : 1, transition: 'opacity 0.7s ease',
      pointerEvents: phase === 2 ? 'none' : 'all',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        opacity: 1, textAlign: 'center', padding: '0 24px',
      }}>
        <img src={LOGO_MARK} alt="PikiShield" width={128} height={128}
          style={{ width: 128, height: 128, display: 'block', margin: '0 auto' }} />
        <div style={{ opacity: phase >= 1 ? 1 : 0, transition: 'opacity .6s ease' }}>
        <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 700, fontSize: 38, color: '#111111', marginTop: 6, lineHeight: 1.1 }}>
          PikiShield
        </div>
        <div style={{ width: 56, height: 2, background: '#111111', margin: '16px auto 12px' }} />
        <div style={{ fontSize: 12.5, letterSpacing: '1.8px', color: 'rgba(17,17,17,.75)', textTransform: 'uppercase', fontWeight: 600 }}>
          Protecting every ride, every day
        </div>
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'rgba(17,17,17,.12)' }}>
        <div style={{ height: '100%', background: '#111111', width: phase === 2 ? '100%' : phase === 1 ? '75%' : '5%', transition: phase === 1 ? "width 1.1s ease" : 'width 0.5s ease' }} />
      </div>
    </div>
  );
}
