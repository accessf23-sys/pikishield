import React from 'react';
import { LOGO_MARK } from './logoAssets';

// PikiShield logo: yellow helmet mark + wordmark. Same props as before.
export default function PikiLogo({ size = 40, textSize = 20, showText = true, light = false }) {
  const textColor = light ? '#FFFFFF' : '#0B1F3A';
  const subColor  = light ? 'rgba(255,255,255,0.6)' : '#6B7683';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <img src={LOGO_MARK} alt="PikiShield" width={size} height={size}
        style={{ width: size, height: size, borderRadius: Math.round(size * 0.24), display: 'block', flexShrink: 0 }} />
      {showText && (
        <div>
          <div style={{ fontFamily: "'Source Serif 4', Georgia, serif", fontWeight: 700, fontSize: textSize, color: textColor, lineHeight: 1 }}>PikiShield</div>
          <div style={{ fontSize: Math.max(8, textSize * 0.48), color: subColor, fontWeight: 600, letterSpacing: '1.3px', textTransform: 'uppercase', marginTop: 3 }}>Micro-Protection</div>
        </div>
      )}
    </div>
  );
}
