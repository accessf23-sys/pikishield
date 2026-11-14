import React from 'react';

// Sign in / Create account switch shown at the top of both auth screens.
export default function AuthTabs({ active, onChange }) {
  const tab = (key, to, label) => (
    <button type="button" onClick={() => onChange && onChange(key)} style={{ border: 'none', cursor: 'pointer', fontFamily: 'inherit',
      flex: 1, textAlign: 'center', padding: '8px 0', fontSize: 13, fontWeight: 600, 
      color: active === key ? '#FFFFFF' : '#3B4B6B',
      background: active === key ? '#0B1F3A' : 'transparent',
      borderRadius: 6,
    }}>{label}</button>
  );
  return (
    <div style={{ display: 'flex', gap: 4, padding: 4, background: '#EEF1F6', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 16 }}>
      {tab('login', '/login', 'Sign in')}
      {tab('register', '/register', 'Create account')}
    </div>
  );
}
