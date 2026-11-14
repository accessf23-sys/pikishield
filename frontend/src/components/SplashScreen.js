import React, { useEffect, useState } from 'react';
import { LOGO_TILE } from './logoAssets';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 150);
    const t2 = setTimeout(() => setPhase(2), 2000);   // start fade out
    const t3 = setTimeout(() => {
      sessionStorage.setItem('piki_splashed', '1');
      if (onDone) onDone();
    }, 2700);                                          // after the fade completes
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, background: '#0B1F3A',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      opacity: phase === 2 ? 0 : 1, transition: 'opacity 0.7s ease',
      pointerEvents: phase === 2 ? 'none' : 'all',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{ opacity: phase >= 1 ? 1 : 0, transition: 'opacity 0.6s ease', textAlign: 'center' }}>
        <img src={LOGO_TILE} alt="PikiShield" width={150} height={150} style={{ width: 150, height: 150, borderRadius: 34, display: 'block', margin: '0 auto', boxShadow: '0 10px 40px rgba(0,0,0,.35)' }} />
        <div style={{ width: 64, height: 1, background: '#FFC907', margin: '24px auto 14px' }} />
        <div style={{ fontSize: 13, letterSpacing: '1.5px', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>
          Protecting every ride, every day
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', background: '#FFC907', width: phase === 2 ? '100%' : phase === 1 ? '75%' : '5%', transition: phase === 1 ? 'width 1.8s ease' : 'width 0.5s ease' }} />
      </div>
    </div>
  );
}
