import React from 'react';

// ── Shared modern motorcycle logo — used on all pages ──────────────────────
export default function PikiLogo({ size = 40, textSize = 20, showText = true, light = false }) {
  const textColor = light ? 'white' : '#0D1F3C';
  const subColor  = light ? 'rgba(255,255,255,0.5)' : '#64748B';
  const s = size;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={s} height={s} viewBox="0 0 44 44" fill="none">
        <defs>
          <linearGradient id="plBg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00C896"/><stop offset="1" stopColor="#0066FF"/>
          </linearGradient>
          <linearGradient id="plMoto" x1="0" y1="0" x2="44" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity=".95"/><stop offset="1" stopColor="#D0F5E8"/>
          </linearGradient>
        </defs>
        {/* Rounded badge */}
        <rect x="1" y="1" width="42" height="42" rx="11" fill="url(#plBg)"/>
        <rect x="1" y="1" width="42" height="42" rx="11" fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1"/>
        {/* Rear wheel */}
        <circle cx="13" cy="30" r="7" fill="none" stroke="url(#plMoto)" strokeWidth="2.2"/>
        <circle cx="13" cy="30" r="2.5" fill="white" opacity=".7"/>
        {/* Front wheel */}
        <circle cx="34" cy="30" r="6" fill="none" stroke="url(#plMoto)" strokeWidth="2.2"/>
        <circle cx="34" cy="30" r="2.2" fill="white" opacity=".7"/>
        {/* Frame */}
        <path d="M13 30 L16 20 L24 18 L34 24 L34 30" stroke="url(#plMoto)" strokeWidth="2" strokeLinejoin="round" fill="none"/>
        {/* Seat */}
        <path d="M18 18 Q22 14 28 16 L24 18 Z" fill="white" opacity=".75"/>
        {/* Engine */}
        <rect x="19" y="20" width="8" height="6" rx="2" fill="white" opacity=".45"/>
        {/* Handlebar */}
        <path d="M30 18 L34 16 L35 19" stroke="url(#plMoto)" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
        {/* Exhaust */}
        <path d="M14 27 Q10 28 8 32" stroke="url(#plMoto)" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        {/* Rider helmet */}
        <circle cx="29" cy="14" r="4" fill="white" opacity=".65"/>
        <path d="M26 16 Q27 20 29 20 Q31 20 32 16" fill="white" opacity=".4"/>
      </svg>

      {showText && (
        <div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontWeight: 800, fontSize: textSize,
            color: textColor, letterSpacing: '-0.4px', lineHeight: 1,
          }}>PikiShield</div>
          <div style={{
            fontSize: textSize * 0.48, color: subColor,
            fontWeight: 500, letterSpacing: '1.3px',
            textTransform: 'uppercase', marginTop: 2,
          }}>Micro-Protection</div>
        </div>
      )}
    </div>
  );
}
