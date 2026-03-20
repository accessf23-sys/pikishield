import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';

const NAV = {
  rider: [
    { label: 'Dashboard', icon: '', path: '/dashboard' },
    { label: 'My Policies', icon: '', path: '/policies' },
    { label: 'Claims', icon: '', path: '/claims' },
    { label: 'Payments', icon: '', path: '/payments' },
    { label: 'Shield Tokens', icon: '🪙', path: '/tokens' },
    { label: 'Transactions', icon: '', path: '/transactions' },
    { divider: true },
    { label: 'Add Cover', icon: '', path: '/subscribe' },
  ],
  nok: [
    { label: 'My Claims', icon: '', path: '/claims' },
  ],
  admin: [
    { label: 'Overview', icon: '', path: '/admin' },
    { label: 'Claims Review', icon: '', path: '/admin/claims' },
    { label: 'Admins', icon: '', path: '/admin/users' },
    { label: 'Field Agents', icon: '', path: '/admin/agents' },
  ],
  agent: [
    { label: 'Dashboard', icon: '', path: '/agent' },
  ],
  member: [
    { label: 'My Account', icon: '', path: '/member-dashboard' },
    { label: 'Claims', icon: '', path: '/claims' },
  ],
};

const ROLE_LABELS = {
  rider: 'Rider',
  nok: 'Next of Kin',
  admin: 'Administrator',
  superadmin: 'Super Admin',
  agent: 'Field Agent',
  member: 'Funeral Member',
};

function ShieldLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
        <defs>
          <linearGradient id="slgBg" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00C896" />
            <stop offset="1" stopColor="#0066FF" />
          </linearGradient>
          <linearGradient id="slgMoto" x1="0" y1="0" x2="44" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="white" stopOpacity=".95" />
            <stop offset="1" stopColor="#D0F5E8" />
          </linearGradient>
        </defs>
        <rect x="1" y="1" width="42" height="42" rx="11" fill="url(#slgBg)" />
        <rect x="1" y="1" width="42" height="42" rx="11" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="1" />
        <circle cx="13" cy="30" r="7" fill="none" stroke="url(#slgMoto)" strokeWidth="2.2" />
        <circle cx="13" cy="30" r="2.5" fill="white" opacity=".7" />
        <circle cx="34" cy="30" r="6" fill="none" stroke="url(#slgMoto)" strokeWidth="2.2" />
        <circle cx="34" cy="30" r="2.2" fill="white" opacity=".7" />
        <path d="M13 30 L16 20 L24 18 L34 24 L34 30" stroke="url(#slgMoto)" strokeWidth="2" strokeLinejoin="round" fill="none" />
        <path d="M18 18 Q22 14 28 16 L24 18 Z" fill="white" opacity=".75" />
        <rect x="19" y="20" width="8" height="6" rx="2" fill="white" opacity=".5" />
        <path d="M30 18 L34 16 L35 19" stroke="url(#slgMoto)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <path d="M14 27 Q10 28 8 32" stroke="url(#slgMoto)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <circle cx="29" cy="14" r="4" fill="white" opacity=".65" />
        <path d="M26 16 Q27 20 29 20 Q31 20 32 16" fill="white" opacity=".45" />
      </svg>
      <div>
        <div style={{ fontFamily: "'Plus Jakarta Sans',sans-serif", fontWeight: 800, fontSize: 16, color: 'white', letterSpacing: '-0.2px', lineHeight: 1 }}>
          PikiShield
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,.45)', letterSpacing: '1.4px', textTransform: 'uppercase', marginTop: 2 }}>
          Micro-Protection
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!user) return null;

  const navRole = user.role === 'superadmin' ? 'admin' : user.role;
  const items = NAV[navRole] || NAV.rider;
  const initials = (user?.fullName || '?')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Agents cannot change password via sidebar (they use the forced modal)
  const showChangePassword = user.role !== 'agent';

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ cursor: 'pointer' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div onClick={() => navigate(NAV[navRole]?.[0]?.path || '/dashboard')}>
            <ShieldLogo />
          </div>
          <NotificationBell />
        </div>
      </div>

      <nav className="sidebar-nav" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
        <div className="nav-section-label">Menu</div>
        {items.map((item, idx) =>
          item.divider ? (
            <div key={idx} style={{ height: 1, background: 'rgba(255,255,255,.07)', margin: '6px 8px' }} />
          ) : (
            <button
              key={item.path}
              className={`nav-item ${pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          )
        )}
      </nav>

      <div className="sidebar-footer">
        <div style={{ padding: '0 4px', marginBottom: 8 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
            Account
          </span>
        </div>

        <div className="user-card-mini">
          <div className="avatar-mini">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.fullName?.split(' ')[0] || '—'}
            </div>
            <div className="role">{ROLE_LABELS[user.role] || user.role}</div>
          </div>
        </div>

        {showChangePassword && (
          <button
            className={`nav-item ${pathname === '/password' ? 'active' : ''}`}
            onClick={() => navigate('/password')}
            style={{ marginTop: 2 }}
          >
            <span className="nav-icon"></span>
            Change Password
          </button>
        )}

        <button className="nav-item" onClick={logout} style={{ color: '#F87171', marginTop: 2 }}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
