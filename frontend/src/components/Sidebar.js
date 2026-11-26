import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import PikiLogo from './PikiLogo';

const NAV = {
  rider: [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Policies', path: '/policies' },
    { label: 'Claims', path: '/claims' },
    { label: 'Pay', path: '/payments' },
    { label: 'Tokens', path: '/tokens' },
    { label: 'Transactions', path: '/transactions' },
    { divider: true },
    { label: 'Add Cover', path: '/subscribe' },
  ],
  nok: [
    { label: 'My Claims', path: '/claims' },
  ],
  admin: [
    { label: 'Overview', path: '/admin' },
    { label: 'Claims Review', path: '/admin/claims' },
    { label: 'Members', path: '/admin/users' },
    { label: 'Field Agents', path: '/admin/agents' },
  ],
  superadmin: [
    { label: 'Overview', path: '/admin' },
    { label: 'Claims Review', path: '/admin/claims' },
    { label: 'Admins', path: '/admin/users' },
    { label: 'Field Agents', path: '/admin/agents' },
  ],
  agent: [
    { label: 'Dashboard', path: '/agent' },
  ],
  member: [
    { label: 'My Account', path: '/member-dashboard' },
    { label: 'Claims', path: '/claims' },
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
  return <PikiLogo size={34} textSize={16} light />;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  if (!user) return null;

  const navRole = user.role;
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
          <div onClick={() => navigate(NAV[navRole]?.[0]?.path || '/dashboard', { replace: true })}>
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
              onClick={() => navigate(item.path, { replace: true })}
            >
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
            onClick={() => navigate('/password', { replace: true })}
            style={{ marginTop: 2 }}
          >
            Change Password
          </button>
        )}

        <button className="nav-item" onClick={logout} style={{ color: '#F2A9A9', marginTop: 2 }}>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
