import React from 'react';

// Small line-icon set (24x24, currentColor stroke). Usage: <Icon name="wallet" size={20} color="#0F7B5C" />
const P = {
  wallet:  <><path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H18a1 1 0 0 1 1 1v2"/><path d="M3 7.5V17a2 2 0 0 0 2 2h14a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H5.5A2.5 2.5 0 0 1 3 7.5Z"/><circle cx="16" cy="13.5" r="1.2"/></>,
  clock:   <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  check:   <><circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.7 2.7L16 9.5"/></>,
  claim:   <><path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></>,
  shield:  <><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z"/><path d="M8.5 12l2.5 2.5L15.5 10"/></>,
  card:    <><rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18"/><path d="M7 15h3"/></>,
  users:   <><circle cx="9" cy="8.5" r="3.2"/><path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><path d="M16 6.2a3 3 0 0 1 0 5.6M18 14c2 .6 3.2 2.2 3.2 5"/></>,
  user:    <><circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c0-3.6 3-6 7-6s7 2.4 7 6"/></>,
  coin:    <><circle cx="12" cy="12" r="9"/><path d="M12 7.5v9M9.5 10c0-1 1.1-1.7 2.5-1.7s2.5.7 2.5 1.7-1.1 1.6-2.5 1.8-2.5.8-2.5 1.8 1.1 1.7 2.5 1.7 2.5-.7 2.5-1.7"/></>,
  plus:    <><path d="M12 5v14M5 12h14"/></>,
  arrow:   <><path d="M5 12h14M13 6l6 6-6 6"/></>,
  chevron: <><path d="M9 6l6 6-6 6"/></>,
  bike:    <><circle cx="6" cy="16" r="3.2"/><circle cx="18" cy="16" r="3.2"/><path d="M6 16l3.5-6H15l3 6"/><path d="M9.5 10l2.5 6H6"/><path d="M15 10l1.5-3.5H19"/></>,
  alert:   <><path d="M12 4l9 16H3L12 4Z"/><path d="M12 10v4M12 17v.5"/></>,
  list:    <><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>,
  chart:   <><path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/></>,
};

export default function Icon({ name, size = 20, color = 'currentColor', stroke = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
      {P[name] || null}
    </svg>
  );
}
